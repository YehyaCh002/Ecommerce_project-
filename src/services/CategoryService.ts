import { AppDataSource } from '../config/data-source';
import { Category } from '../entities/Category';
import { cacheService } from './RedisCacheService';

export class CategoryService {
  private categoryRepository = AppDataSource.getRepository(Category);

  async createCategory(data: {
    name: string;
    description?: string;
    slug?: string;
    parentCategoryId?: number;
  }): Promise<Category> {
    if (data.parentCategoryId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: data.parentCategoryId },
      });
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    // Check for existing category by name to avoid duplicate key errors
    const existing = await this.categoryRepository.findOne({
      where: { name: data.name },
    });
    if (existing) {
      throw new Error(`Category with name "${data.name}" already exists`);
    }

    const category = this.categoryRepository.create(data);
    const saved = await this.categoryRepository.save(category);
    await this.clearCategoryCache();
    return saved;
  }

  async getAllCategories(pagination?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    let limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : 100;
    const skip = (page - 1) * limit;

    const cacheKey = `categories:${page}:${limit}`;

    if (cacheService.isEnabled) {
      const cached = await cacheService.get<{
        data: Category[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(cacheKey);
      if (cached.hit && cached.value) {
        return cached.value;
      }
    }

    const [categories, total] = await this.categoryRepository.findAndCount({
      relations: ['products', 'parentCategory', 'subCategories'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    if (total === 0) {
      limit = 0;
    }

    const result = {
      data: categories,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };

    if (cacheService.isEnabled) {
      await cacheService.set(cacheKey, result);
    }

    return result;
  }

  async clearCategoryCache(): Promise<void> {
    await Promise.all([
      cacheService.flushPrefix('categories:'),
      cacheService.flushPrefix('products:'),
    ]);
  }

  async getCategoryById(id: number): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { id },
      relations: ['products', 'parentCategory', 'subCategories'],
    });
  }

  async updateCategory(
    id: number,
    data: Partial<Category>
  ): Promise<Category | null> {
    await this.categoryRepository.update(id, data);
    const updated = await this.getCategoryById(id);
    await this.clearCategoryCache();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await this.categoryRepository.delete(id);
    await this.clearCategoryCache();
    return result.affected !== 0;
  }
}
