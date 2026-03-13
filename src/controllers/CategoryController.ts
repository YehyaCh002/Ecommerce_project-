import { FastifyRequest, FastifyReply } from 'fastify';
import { CategoryService } from '../services/CategoryService';

export class CategoryController {
  private categoryService = new CategoryService();

  createCategory = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const category = await this.categoryService.createCategory(req.body as any);
      res.status(201).send({
        success: true,
        data: category,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).send({
          success: false,
          message: error.message,
        });
        return;
      }
      throw error;
    }
  };

  getAllCategories = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const categories = await this.categoryService.getAllCategories();
      res.status(200).send({
        success: true,
        data: categories,
      });
    } catch (error) {
      throw error;
    }
  };

  getCategoryById = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const category = await this.categoryService.getCategoryById(id);
      if (!category) {
        res.status(404).send({
          success: false,
          message: 'Category not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        data: category,
      });
    } catch (error) {
      throw error;
    }
  };

  updateCategory = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const category = await this.categoryService.updateCategory(
        id,
        req.body as any
      );
      if (!category) {
        res.status(404).send({
          success: false,
          message: 'Category not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        data: category,
      });
    } catch (error) {
      throw error;
    }
  };

  deleteCategory = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const deleted = await this.categoryService.deleteCategory(id);
      if (!deleted) {
        res.status(404).send({
          success: false,
          message: 'Category not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      throw error;
    }
  };
}
