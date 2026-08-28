import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module';
import { AppDataSource } from '../config/data-source';

export async function initializeDataSource() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}

export async function destroyDataSource() {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}

export async function setupTest(): Promise<FastifyInstance> {
  await initializeDataSource();

  const instance = Fastify({ logger: false });
  await instance.register(cookie as any, {
    secret: process.env.COOKIE_SECRET || 'super-secret-cookie-xyz-123',
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(instance as any),
    { logger: false },
  );

  await app.init();
  await instance.ready();

  return instance;
}

export async function teardownTest(app: FastifyInstance) {
  await app.close();
  await destroyDataSource();
}

export async function sendRequest(
  app: FastifyInstance,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    payload?: any;
    headers?: any;
  },
) {
  const response = await app.inject({
    method: options.method,
    url: options.url,
    payload: options.payload,
    headers: options.headers,
  });

  return {
    status: response.statusCode,
    body: response.json() as any,
    headers: response.headers,
  };
}

import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

export async function sendAuthenticatedRequest(
  app: FastifyInstance,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    payload?: any;
    userId?: string;
    role?: 'customer' | 'admin';
    headers?: any;
  },
) {
  const { userId = '5', role = 'customer', ...rest } = options;

  const token = jwt.sign({ id: Number(userId), role }, JWT_SECRET, { expiresIn: '1h' });

  return sendRequest(app, {
    ...rest,
    headers: {
      ...options.headers,
      authorization: `Bearer ${token}`,
    },
  });
}

export async function sendAdminRequest(
  app: FastifyInstance,
  options: Omit<Parameters<typeof sendRequest>[1], 'headers'> & { headers?: any },
) {
  return sendAuthenticatedRequest(app, {
    ...options,
    userId: '1',
    role: 'admin',
  });
}
