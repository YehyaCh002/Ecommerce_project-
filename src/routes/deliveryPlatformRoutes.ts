import { FastifyInstance } from 'fastify';
import { DeliveryPlatformController } from '../controllers/DeliveryPlatformController';
import { authenticate, requireAdmin } from '../middlewares/auth';

export default async function deliveryPlatformRoutes(fastify: FastifyInstance) {
  const platformController = new DeliveryPlatformController();

  // Public/All staff could see platforms (to select one for an order)
  fastify.get(
    '/',
    { preHandler: [authenticate] },
    (request, reply) => platformController.getAllPlatforms(request, reply)
  );

  // Admin-only management
  fastify.post(
    '/',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => platformController.createPlatform(request, reply)
  );

  fastify.patch(
    '/:id',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => platformController.updatePlatform(request, reply)
  );
}
