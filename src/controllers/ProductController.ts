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
      res.status(400).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create product',
      });
    }
  };

  getAllProducts = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const query = req.query as any;
      const filters = {
        categoryId: query.categoryId ? parseInt(query.categoryId as string, 10) : undefined,
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
      const product = await this.productService.getProductById(parseInt(id, 10));
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
        parseInt(id, 10),
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
      res.status(400).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update product',
      });
    }
  };

  deleteProduct = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const deleted = await this.productService.deleteProduct(parseInt(id, 10));
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
      const { quantity, type, variantUpdates } = req.body as {
        quantity: number;
        type?: string;
        variantUpdates?: Array<{ variantId: number; newStock: number }>;
      };
      const product = await this.productService.updateStock(
        parseInt(id, 10),
        quantity,
        { type, variantUpdates }
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
      res.status(400).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update stock',
      });
    }
  };

  updateProductStatus = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const { isActive } = req.body as { isActive: boolean };

      const product = await this.productService.setProductActiveState(
        parseInt(id, 10),
        isActive
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
      res.status(400).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update product status',
      });
    }
  };

  getStockMovements = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const query = (req.query as any) || {};
      const types = query.types
        ? String(query.types)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined;

      const movements = await this.productService.getStockMovements({
        types,
        startDate: query.startDate,
        endDate: query.endDate,
        categorySearch: query.categorySearch,
      });

      res.status(200).send({
        success: true,
        data: movements,
        count: movements.length,
      });
    } catch (error) {
      throw error;
    }
  };

  getStockMovementDetails = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const movement = await this.productService.getStockMovementDetails(
        parseInt(id, 10)
      );

      if (!movement) {
        res.status(404).send({
          success: false,
          message: 'Stock movement not found',
        });
        return;
      }

      res.status(200).send({
        success: true,
        data: movement,
      });
    } catch (error) {
      throw error;
    }
  };
}
