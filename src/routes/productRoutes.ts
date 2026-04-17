import { FastifyInstance } from 'fastify';
import { ProductController } from '../controllers/ProductController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from '../schemas/productSchema';

export default async function productRoutes(fastify: FastifyInstance) {
  const productController = new ProductController();

  // Public routes
  fastify.get('/', (request, reply) => productController.getAllProducts(request, reply));

  // Inventory movement routes (must be declared before /:id)
  fastify.get(
    '/stock-movements',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => productController.getStockMovements(request, reply)
  );

  fastify.get(
    '/stock-movements/:id',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => productController.getStockMovementDetails(request, reply)
  );

  fastify.get('/:id', (request, reply) => productController.getProductById(request, reply));

  // Admin routes
  fastify.post(
    '/',
    { 
      preHandler: [authenticate, requireAdmin],
      schema: createProductSchema
    },
    (request, reply) => productController.createProduct(request, reply)
  );

  // Backward-compatible alias for older clients.
  fastify.post(
    '/addProd',
    {
      preHandler: [authenticate, requireAdmin],
      schema: createProductSchema
    },
    (request, reply) => productController.createProduct(request, reply)
  );

  fastify.put(
    '/:id',
    { 
      preHandler: [authenticate, requireAdmin],
      schema: updateProductSchema
    },
    (request, reply) => productController.updateProduct(request, reply)
  );

  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => productController.deleteProduct(request, reply)
  );

  fastify.patch(
    '/:id/stock',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => productController.updateStock(request, reply)
  );

  fastify.patch(
    '/:id/status',
    {
      preHandler: [authenticate, requireAdmin],
      schema: updateProductStatusSchema,
    },
    (request, reply) => productController.updateProductStatus(request, reply)
  );
}
