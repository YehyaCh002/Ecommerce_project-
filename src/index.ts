import 'reflect-metadata';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import { AppDataSource } from './config/data-source';
import { errorHandler } from './middlewares/errorHandler';
import { Logger } from './utils/logger';

dotenv.config();

const app = Fastify({
  logger: false // You can enable fastify's built in logger if needed, but keeping console logger for now to match interface.
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// =====================
// Middleware Plugins
// =====================
app.register(cors);

// =====================
// Basic Routes
// =====================
app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  return {
    message: 'E-commerce API with Fastify, TypeScript, PostgreSQL, and TypeORM',
    status: 'running',
  };
});

app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const isConnected = AppDataSource.isInitialized;

    return {
      status: 'healthy',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    reply.status(500);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// =====================
// Route Plugins Integration
// =====================
app.register(apiRoutes);

// =====================
// Error Handler
// =====================
app.setErrorHandler(errorHandler);

// =====================
// Initialize Database & Start Server
// =====================
AppDataSource.initialize()
  .then(() => {
    Logger.info('Database connection established successfully');

    app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        Logger.error('Error starting server:', err);
        process.exit(1);
      }
      Logger.info(`Server is running at ${address}`);
    });
  })
  .catch((error) => {
    Logger.error('Error during Data Source initialization:', error);
    process.exit(1);
  });

// =====================
// Graceful Shutdown
// =====================
process.on('SIGTERM', async () => {
  Logger.info('SIGTERM signal received: closing server');

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    Logger.info('Database connection closed');
  }
  
  await app.close();
  process.exit(0);
});