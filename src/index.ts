import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orderRoutes from './routes/orderRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import cartRoutes from './routes/cartRoutes';
import { AppDataSource } from './config/data-source';
import { errorHandler } from './middlewares/errorHandler';
import { Logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());

// =====================
// Basic Routes
// =====================
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'E-commerce API with Express, TypeScript, PostgreSQL, and TypeORM',
    status: 'running',
  });
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    const isConnected = AppDataSource.isInitialized;

    res.json({
      status: 'healthy',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


app.use('/orders', orderRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/cart', cartRoutes);

// =====================
// Error Handler (MUST be after routes)
// =====================
app.use(errorHandler);

// =====================
// Initialize Database & Start Server
// =====================
AppDataSource.initialize()
  .then(() => {
    Logger.info('Database connection established successfully');

    app.listen(PORT, () => {
      Logger.info(`Server is running on port ${PORT}`);
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

  process.exit(0);
});