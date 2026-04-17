import { AppDataSource } from '../config/data-source';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { StockMovement } from '../entities/StockMovement';
import { Category } from '../entities/Category';
import { FindOptionsWhere, Like } from 'typeorm';

export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);
  private variantRepository = AppDataSource.getRepository(ProductVariant);
  private stockMovementRepository = AppDataSource.getRepository(StockMovement);
  private categoryRepository = AppDataSource.getRepository(Category);

  private decorateProductWithMetrics(product: Product | null): Product | null {
    if (!product) return null;

    const price = Number(product.price || 0);
    const costPrice = Number(product.costPrice || 0);
    const expectedProfitPerUnit = Number((price - costPrice).toFixed(2));
    const expectedMarginPercent =
      price > 0 ? Number((((price - costPrice) / price) * 100).toFixed(2)) : 0;

    Object.assign(product as any, {
      expectedProfitPerUnit,
      expectedMarginPercent,
    });

    return product;
  }

  private buildStockMovementDetails(
    variants: ProductVariant[],
    oldByVariantId: Map<number, number>,
    newByVariantId: Map<number, number>
  ): any {
    const groupedByColor: Record<
      string,
      {
        oldStock: number;
        newStock: number;
        sizes: Array<{ size: string; oldStock: number; newStock: number }>;
      }
    > = {};

    for (const variant of variants) {
      const color = variant.color || 'UNSPECIFIED';
      if (!groupedByColor[color]) {
        groupedByColor[color] = {
          oldStock: 0,
          newStock: 0,
          sizes: [],
        };
      }

      const oldStock = oldByVariantId.get(variant.id) ?? Number(variant.stock || 0);
      const newStock = newByVariantId.get(variant.id) ?? Number(variant.stock || 0);

      groupedByColor[color].oldStock += oldStock;
      groupedByColor[color].newStock += newStock;
      groupedByColor[color].sizes.push({
        size: variant.size || '-',
        oldStock,
        newStock,
      });
    }

    return {
      colors: groupedByColor,
    };
  }

  async getStockMovements(filters?: {
    types?: string[];
    startDate?: string;
    endDate?: string;
    categorySearch?: string;
  }): Promise<any[]> {
    const query = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('movement.createdAt', 'DESC');

    if (filters?.types && filters.types.length > 0) {
      query.andWhere('movement.type IN (:...types)', { types: filters.types });
    }

    if (filters?.startDate) {
      query.andWhere('movement.createdAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.andWhere('movement.createdAt <= :endDate', { endDate });
    }

    if (filters?.categorySearch) {
      query.andWhere('category.name ILIKE :categorySearch', {
        categorySearch: `%${filters.categorySearch}%`,
      });
    }

    const movements = await query.getMany();
    return movements.map((movement) => ({
      id: movement.id,
      productId: movement.productId,
      productName: movement.product?.name || 'Unknown product',
      productImageUrl: movement.product?.imageUrl || null,
      type: movement.type,
      totalChanges: movement.totalChanges,
      oldStock: movement.oldStock,
      newStock: movement.newStock,
      createdAt: movement.createdAt,
    }));
  }

  async getStockMovementDetails(id: number): Promise<any | null> {
    const movement = await this.stockMovementRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!movement) return null;

    return {
      id: movement.id,
      productId: movement.productId,
      productName: movement.product?.name || 'Unknown product',
      type: movement.type,
      totalChanges: movement.totalChanges,
      oldStock: movement.oldStock,
      newStock: movement.newStock,
      createdAt: movement.createdAt,
      details: movement.details || {},
    };
  }

  async createProduct(data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    costPrice?: number;
    imageUrl?: string;
    sku?: string;
    categoryId?: number;
    subCategoryId?: number;
    isLandingPageProduct?: boolean;
    deductStockOnConfirmation?: boolean;
    variants?: Array<{
      size?: string;
      color?: string;
      stock?: number;
      priceOverride?: number;
      sku?: string;
      imageUrl?: string;
    }>;
  }): Promise<Product> {
    if (data.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    if (data.subCategoryId) {
      const subCategory = await this.categoryRepository.findOne({
        where: { id: data.subCategoryId },
      });

      if (!subCategory) {
        throw new Error('Sub-category not found');
      }

      if (
        data.categoryId &&
        subCategory.parentCategoryId &&
        subCategory.parentCategoryId !== data.categoryId
      ) {
        throw new Error('Sub-category does not belong to selected category');
      }
    }

    const product = this.productRepository.create({
      name: data.name,
      description: data.description,
      price: data.price,
      costPrice: data.costPrice ?? 0,
      stock: data.stock ?? 0,
      imageUrl: data.imageUrl,
      sku: data.sku,
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      isLandingPageProduct: data.isLandingPageProduct ?? false,
      deductStockOnConfirmation: data.deductStockOnConfirmation ?? true,
    });

    const savedProduct = await this.productRepository.save(product);

    const oldByVariantId = new Map<number, number>();
    const newByVariantId = new Map<number, number>();
    const createdVariants: ProductVariant[] = [];

    if (data.variants && data.variants.length > 0) {
      for (const item of data.variants) {
        const variant = this.variantRepository.create({
          productId: savedProduct.id,
          size: item.size,
          color: item.color,
          stock: Number(item.stock ?? 0),
          priceOverride: item.priceOverride,
          sku: item.sku,
          imageUrl: item.imageUrl,
        });
        const savedVariant = await this.variantRepository.save(variant);
        createdVariants.push(savedVariant);
        oldByVariantId.set(savedVariant.id, 0);
        newByVariantId.set(savedVariant.id, Number(savedVariant.stock || 0));
      }
    }

    await this.stockMovementRepository.save(
      this.stockMovementRepository.create({
        productId: savedProduct.id,
        type: 'initial_creation',
        totalChanges: Number(savedProduct.stock || 0),
        oldStock: 0,
        newStock: Number(savedProduct.stock || 0),
        details: this.buildStockMovementDetails(
          createdVariants,
          oldByVariantId,
          newByVariantId
        ),
      })
    );

    const result = await this.getProductById(savedProduct.id);
    return this.decorateProductWithMetrics(result) as Product;
  }

  async getAllProducts(filters?: {
    categoryId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
  }): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = {};

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    let query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subCategory', 'subCategory')
      .leftJoinAndSelect('product.variants', 'variants');

    if (filters?.categoryId) {
      query = query.andWhere('product.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.search) {
      query = query.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters?.minPrice !== undefined) {
      query = query.andWhere('product.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters?.maxPrice !== undefined) {
      query = query.andWhere('product.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    if (filters?.isActive !== undefined) {
      query = query.andWhere('product.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    const products = await query.orderBy('product.createdAt', 'DESC').getMany();
    return products.map((product) => this.decorateProductWithMetrics(product) as Product);
  }

  async getProductById(id: number): Promise<Product | null> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'subCategory', 'variants'],
    });
    return this.decorateProductWithMetrics(product);
  }

  async updateProduct(
    id: number,
    data: Partial<Product>
  ): Promise<Product | null> {
    if (data.subCategoryId) {
      const subCategory = await this.categoryRepository.findOne({
        where: { id: data.subCategoryId },
      });
      if (!subCategory) {
        throw new Error('Sub-category not found');
      }
    }

    await this.productRepository.update(id, data);
    const updated = await this.getProductById(id);
    return this.decorateProductWithMetrics(updated);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.productRepository.delete(id);
    return result.affected !== 0;
  }

  async updateStock(
    id: number,
    quantity: number,
    options?: {
      type?: string;
      variantUpdates?: Array<{ variantId: number; newStock: number }>;
    }
  ): Promise<Product | null> {
    const product = await this.getProductById(id);
    if (!product) return null;

    const oldStock = Number(product.stock || 0);
    const variants = product.variants || [];
    const oldByVariantId = new Map<number, number>();
    const newByVariantId = new Map<number, number>();

    for (const variant of variants) {
      oldByVariantId.set(variant.id, Number(variant.stock || 0));
    }

    if (options?.variantUpdates && options.variantUpdates.length > 0) {
      const variantsById = new Map<number, ProductVariant>();
      for (const variant of variants) {
        variantsById.set(variant.id, variant);
      }

      for (const update of options.variantUpdates) {
        const target = variantsById.get(update.variantId);
        if (!target) {
          continue;
        }
        target.stock = Number(update.newStock);
        newByVariantId.set(target.id, Number(update.newStock));
        await this.variantRepository.save(target);
      }
    }

    product.stock = quantity;
    const saved = await this.productRepository.save(product);

    const details = this.buildStockMovementDetails(variants, oldByVariantId, newByVariantId);

    await this.stockMovementRepository.save(
      this.stockMovementRepository.create({
        productId: product.id,
        type: options?.type || 'manual',
        totalChanges: Math.abs(Number(quantity) - oldStock),
        oldStock,
        newStock: Number(quantity),
        details,
      })
    );

    return saved;
  }

  async decreaseStock(id: number, quantity: number): Promise<boolean> {
    const product = await this.getProductById(id);
    if (!product || product.stock < quantity) return false;

    product.stock -= quantity;
    await this.productRepository.save(product);
    return true;
  }

  async decreaseVariantStock(variantId: number, quantity: number): Promise<boolean> {
    const variant = await this.variantRepository.findOne({ where: { id: variantId } });
    if (!variant || variant.stock < quantity) return false;

    variant.stock -= quantity;
    await this.variantRepository.save(variant);
    return true;
  }

  async updateVariantStock(variantId: number, quantity: number): Promise<ProductVariant | null> {
    const variant = await this.variantRepository.findOne({ where: { id: variantId } });
    if (!variant) return null;

    variant.stock = quantity;
    return await this.variantRepository.save(variant);
  }
}
