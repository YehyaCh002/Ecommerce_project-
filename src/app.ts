import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import secureSession from '@fastify/secure-session';
import { fastifyPassport } from './config/passport';
import apiRoutes from './routes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middlewares/errorHandler';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  // ─── CORS ─────────────────────────────────────────────────────────────────
  await app.register(cors, {
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

  // ─── Cookies (for manual JWT HttpOnly cookies) ────────────────────────────
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'super-secret-cookie-xyz-123',
  });

  // ─── Secure Session (required by @fastify/passport) ───────────────────────
  await app.register(secureSession, {
    secret: (process.env.SESSION_SECRET || 'a-very-long-secret-that-is-32-chars!!').padEnd(32, '!').slice(0, 32),
    salt: (process.env.SESSION_SALT || 'mq9hDxBVDbspDR6n').slice(0, 16).padEnd(16, '0'),
    cookie: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  // ─── Passport ─────────────────────────────────────────────────────────────
  await app.register(fastifyPassport.initialize());
  await app.register(fastifyPassport.secureSession());

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.get('/', async () => ({
    message: 'E-commerce API with Fastify, TypeScript, PostgreSQL, and TypeORM',
    status: 'running',
  }));

  app.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }));

  // Auth routes (Google OAuth redirects live at /auth/*)
  await app.register(authRoutes);

  // All API routes
  await app.register(apiRoutes);

  app.setErrorHandler(errorHandler);

  return app;
}