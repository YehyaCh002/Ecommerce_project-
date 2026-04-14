import { FastifyInstance } from 'fastify';
import { OrderController } from '../controllers/OrderController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { createOrderSchema, updateOrderSchema, quickOrderSchema } from '../schemas/orderSchema';

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

  fastify.post(
    '/quick-order',
    { schema: quickOrderSchema },
    (request, reply) => orderController.createQuickOrder(request, reply)
  );

  fastify.get(
    '/my-orders',
    { preHandler: [authenticate] },
    (request, reply) => orderController.getUserOrders(request, reply)
  );

  fastify.get(
    '/reclamations',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.getReclamationOrders(request, reply)
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

  fastify.post(
    '/:id/cancel-request',
    { preHandler: [authenticate] },
    (request, reply) => orderController.requestCancellation(request, reply)
  );

  fastify.post(
    '/:id/exchange/request',
    { preHandler: [authenticate] },
    (request, reply) => orderController.requestExchange(request, reply)
  );

  fastify.post(
    '/:id/exchange/approve',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.approveExchange(request, reply)
  );

  fastify.post(
    '/:id/exchange/reject',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.rejectExchange(request, reply)
  );

  fastify.post(
    '/:id/cancel-confirm',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.confirmCancellation(request, reply)
  );

  fastify.post(
    '/:id/cancel-reject',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.rejectCancellation(request, reply)
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

  fastify.put(
    '/:id/update',
    { 
      preHandler: [authenticate, requireAdmin],
      schema: updateOrderSchema
    },
    (request, reply) => orderController.updateOrder(request, reply)
  );

  // Backward compatibility for existing clients using PUT /orders/:id
  fastify.put(
    '/:id',
    {
      preHandler: [authenticate, requireAdmin],
      schema: updateOrderSchema,
    },
    (request, reply) => orderController.updateOrder(request, reply)
  );

  fastify.post(
    '/:id/history',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.logOrderAction(request, reply)
  );

  fastify.patch(
    '/:id/platform',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.updateOrderPlatform(request, reply)
  );
  
  fastify.get(
    '/wilaya-tracking',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.getWilayaTrackingOrders(request, reply)
  );

  fastify.post(
    '/:id/tracking-log',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.addTrackingLog(request, reply)
  );

  fastify.get(
    '/stats/confirmation',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.getConfirmationStats(request, reply)
  );

  fastify.get(
    '/stats/commandes',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => orderController.getCommandesStatistics(request, reply)
  );
}
