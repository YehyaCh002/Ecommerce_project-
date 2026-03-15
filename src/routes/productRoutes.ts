import { FastifyInstance } from 'fastify';
import { ProductController } from '../controllers/ProductController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { createProductSchema, updateProductSchema } from '../schemas/productSchema';

export default async function productRoutes(fastify: FastifyInstance) {
  const productController = new ProductController();

  // Public routes
  fastify.get('/', (request, reply) => productController.getAllProducts(request, reply));
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
}
