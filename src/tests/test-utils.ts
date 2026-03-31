import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';

export async function initializeDataSource() {
  const { AppDataSource } = require('../config/data-source');
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}

export async function destroyDataSource() {
  const { AppDataSource } = require('../config/data-source');
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}

export async function setupTest() {
  await initializeDataSource();
  const app = await buildApp();
  await app.ready();
  
  return app;
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
  }
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

export async function sendAuthenticatedRequest(
  app: FastifyInstance,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    payload?: any;
    userId?: string;
    role?: 'customer' | 'admin';
    headers?: any;
  }
) {
  const { userId = '5', role = 'customer', ...rest } = options;
  
  return sendRequest(app, {
    ...rest,
    headers: {
      ...options.headers,
      'x-user-id': userId,
      'x-user-role': role,
    },
  });
}

export async function sendAdminRequest(
  app: FastifyInstance,
  options: Omit<Parameters<typeof sendRequest>[1], 'headers'> & { headers?: any }
) {
  return sendAuthenticatedRequest(app, {
    ...options,
    userId: '1',
    role: 'admin',
  });
}
