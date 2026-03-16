import { FastifyInstance } from 'fastify';
import { OrderController } from '../controllers/OrderController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { createOrderSchema } from '../schemas/orderSchema';

export default async function orderRoutes(fastify: FastifyInstance) {
  const orderController = new OrderController();

  fastify.get('/test', async (request, reply) => {
    return { message: 'Test route working!' };
  });

  // Customer routes
  fastify.post(
    '/',
    { 
      preHandler: [authenticate],
      schema: createOrderSchema
    },
    (request, reply) => orderController.createOrder(request, reply)
  );

  fastify.get(
    '/my-orders',
    { preHandler: [authenticate] },
    (request, reply) => orderController.getUserOrders(request, reply)
  );

  fastify.get('/:id', (request, reply) => orderController.getOrderById(request, reply));

  fastify.get(
    '/:id/history',
    { preHandler: [authenticate] },
    (request, reply) => orderController.getOrderHistory(request, reply)
  );

  fastify.post(
    '/:id/cancel',
    { preHandler: [authenticate] },
    (request, reply) => orderController.cancelOrder(request, reply)
  );

  // Admin routes
  fastify.get(
    '/',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.getAllOrders(request, reply)
  );

  fastify.patch(
    '/:id/status',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.updateOrderStatus(request, reply)
  );

  fastify.post(
    '/:id/history',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.logOrderAction(request, reply)
  );
}
