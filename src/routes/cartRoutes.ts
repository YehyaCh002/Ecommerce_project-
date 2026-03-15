import { FastifyInstance } from 'fastify';
import { CartController } from '../controllers/CartController';
import { authenticate } from '../middlewares/auth';
import { cartItemSchema } from '../schemas/cartSchema';

export default async function cartRoutes(fastify: FastifyInstance) {
  const cartController = new CartController();

  // All cart routes require authentication
  fastify.get('/', { preHandler: [authenticate] }, (request, reply) => cartController.getCart(request, reply));
  
  fastify.get('/total', { preHandler: [authenticate] }, (request, reply) => cartController.getCartTotal(request, reply));
  
  fastify.post(
    '/items',
    { 
      preHandler: [authenticate],
      schema: cartItemSchema
    },
    (request, reply) => cartController.addItemToCart(request, reply)
  );
  
  fastify.put('/items/:itemId', { preHandler: [authenticate] }, (request, reply) => cartController.updateCartItem(request, reply));
  
  fastify.delete('/items/:itemId', { preHandler: [authenticate] }, (request, reply) => cartController.removeItemFromCart(request, reply));
  
  fastify.delete('/', { preHandler: [authenticate] }, (request, reply) => cartController.clearCart(request, reply));
}
