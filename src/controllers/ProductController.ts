import { FastifyRequest, FastifyReply } from 'fastify';
import { ProductService } from '../services/ProductService';

export class ProductController {
  private productService = new ProductService();

  createProduct = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const product = await this.productService.createProduct(req.body as any);
      res.status(201).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  };

  getAllProducts = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const query = req.query as any;
      const filters = {
        categoryId: query.categoryId as string,
        search: query.search as string,
        minPrice: query.minPrice
          ? parseFloat(query.minPrice as string)
          : undefined,
        maxPrice: query.maxPrice
          ? parseFloat(query.maxPrice as string)
          : undefined,
        isActive:
          query.isActive !== undefined
            ? query.isActive === 'true'
            : undefined,
      };

      const products = await this.productService.getAllProducts(filters);
      res.status(200).send({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      throw error;
    }
  };

  getProductById = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const product = await this.productService.getProductById(id);
      if (!product) {
        res.status(404).send({
          success: false,
          message: 'Product not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  };

  updateProduct = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const product = await this.productService.updateProduct(
        id,
        req.body as any
      );
      if (!product) {
        res.status(404).send({
          success: false,
          message: 'Product not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  };

  deleteProduct = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const deleted = await this.productService.deleteProduct(id);
      if (!deleted) {
        res.status(404).send({
          success: false,
          message: 'Product not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      throw error;
    }
  };

  updateStock = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const { quantity } = req.body as { quantity: number };
      const product = await this.productService.updateStock(
        id,
        quantity
      );
      if (!product) {
        res.status(404).send({
          success: false,
          message: 'Product not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  };
}
