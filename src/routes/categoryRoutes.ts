import { FastifyInstance } from 'fastify';
import { CategoryController } from '../controllers/CategoryController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validateCategory } from '../middlewares/validation';

export default async function categoryRoutes(fastify: FastifyInstance) {
  const categoryController = new CategoryController();

  // Public routes
  fastify.get('/', (request, reply) => categoryController.getAllCategories(request, reply));
  fastify.get('/:id', (request, reply) => categoryController.getCategoryById(request, reply));

  // Admin routes
  fastify.post(
    '/',
    { preHandler: [authenticate, requireAdmin, validateCategory] },
    (request, reply) => categoryController.createCategory(request, reply)
  );

  fastify.put(
    '/:id',
    { preHandler: [authenticate, requireAdmin, validateCategory] },
    (request, reply) => categoryController.updateCategory(request, reply)
  );

  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => categoryController.deleteCategory(request, reply)
  );
}
