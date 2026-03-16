import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false 
  });

  // =====================
  // Middleware Plugins
  // =====================
  await app.register(cors);

  // =====================
  // Basic Routes
  // =====================
  app.get('/', async () => {
    return {
      message: 'E-commerce API with Fastify, TypeScript, PostgreSQL, and TypeORM',
      status: 'running',
    };
  });

  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });

  // =====================
  // Route Plugins Integration
  // =====================
  await app.register(apiRoutes);

  // =====================
  // Error Handler
  // =====================
  app.setErrorHandler(errorHandler);

  return app;
}
