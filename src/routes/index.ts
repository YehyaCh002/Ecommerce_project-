import { FastifyInstance } from 'fastify';
import userRoutes from './userRoutes';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import deliveryPlatformRoutes from './deliveryPlatformRoutes';


export default async function routes(fastify: FastifyInstance) {
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(productRoutes, { prefix: '/products' });
  fastify.register(categoryRoutes, { prefix: '/categories' });
  fastify.register(cartRoutes, { prefix: '/cart' });
  fastify.register(orderRoutes, { prefix: '/orders' });
  fastify.register(deliveryPlatformRoutes, { prefix: '/delivery-platforms' });
}
