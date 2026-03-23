import { AppDataSource } from '../config/data-source';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { FindOptionsWhere, Like } from 'typeorm';

export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);
  private variantRepository = AppDataSource.getRepository(ProductVariant);

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

  async updateStock(id: number, quantity: number): Promise<Product | null> {
    const product = await this.getProductById(id);
    if (!product) return null;

    product.stock = quantity;
    return await this.productRepository.save(product);
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
