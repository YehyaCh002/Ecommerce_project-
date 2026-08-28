import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { AppModule } from './app.module';
import { AppDataSource } from './config/data-source';
import { Logger } from './utils/logger';

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'super-secret-cookie-xyz-123';

export async function bootstrap(): Promise<NestFastifyApplication> {
  await AppDataSource.initialize();
  Logger.info('Database connection successfully');

  const instance = Fastify({ logger: false });
  instance.register(cookie as any, {
    secret: COOKIE_SECRET,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(instance as any),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3002',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  });

  await app.init();
  return app;
}
