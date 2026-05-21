import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false 
  });

  await app.register(cors, {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });
  
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || "super-secret-cookie-xyz-123",
  });

  app.get('/', async () => ({
    message: 'E-commerce API with Fastify, TypeScript, PostgreSQL, and TypeORM',
    status: 'running',
  }));

  app.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }));

  await app.register(apiRoutes);

  app.setErrorHandler(errorHandler);

  return app;
}