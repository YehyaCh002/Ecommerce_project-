import { AppDataSource } from '../config/data-source';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { StockMovement } from '../entities/StockMovement';
import { FindOptionsWhere, Like } from 'typeorm';

export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);
  private variantRepository = AppDataSource.getRepository(ProductVariant);
  private stockMovementRepository = AppDataSource.getRepository(StockMovement);

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
    imageUrl?: string;
    sku?: string;
    categoryId?: number;
  }): Promise<Product> {
    const product = this.productRepository.create(data);
    return await this.productRepository.save(product);
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
      .leftJoinAndSelect('product.category', 'category');

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

    return await query.orderBy('product.createdAt', 'DESC').getMany();
  }

  async getProductById(id: number): Promise<Product | null> {
    return await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'variants'],
    });
  }

  async updateProduct(
    id: number,
    data: Partial<Product>
  ): Promise<Product | null> {
    await this.productRepository.update(id, data);
    return this.getProductById(id);
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
