import 'reflect-metadata';
import dotenv from 'dotenv';
import { buildApp } from './app';
import { AppDataSource } from './config/data-source';
import { Logger } from './utils/logger';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3002', 10);

async function start() {
  try {
    const app = await buildApp();

    // =====================
    // Initialize Database & Start Server
    // =====================
    await AppDataSource.initialize();
    Logger.info('Database connection successfully');

    app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        Logger.error('Error starting server:', err);
        process.exit(1);
      }
      Logger.info(`Server is running at ${address}`);
    });

    // =====================
    // Graceful Shutdown
    // =====================
    const shutdown = async () => {
      Logger.info('Shutdown signal received: closing server');
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        Logger.info('Database connection closed');
      }
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    Logger.error('Error during startup:', error);
    process.exit(1);
  }
}

start();
