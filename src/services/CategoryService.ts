import { AppDataSource } from '../config/data-source';
import { Category } from '../entities/Category';

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
    return await this.categoryRepository.save(category);
  }

  async getAllCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      relations: ['products', 'parentCategory', 'subCategories'],
      order: { name: 'ASC' },
    });
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
    return this.getCategoryById(id);
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await this.categoryRepository.delete(id);
    return result.affected !== 0;
  }
}
