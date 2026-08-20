import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { createUserSchema, updateUserSchema } from '../schemas/userSchema';
import { fastifyPassport } from '../config/passport';

export default async function userRoutes(fastify: FastifyInstance) {
  const userController = new UserController();

  // ─── Auth ──────────────────────────────────────────────────────────────────
  // Passport LocalStrategy validates credentials; controller issues JWT cookies
  fastify.post('/login', {
    preValidation: fastifyPassport.authenticate('local', {
      session: false, // we use JWT cookies, not server-side sessions
      failWithError: true,
    }),
  }, (request, reply) => userController.login(request, reply));

  fastify.post('/refresh-token', (request, reply) =>
    userController.refreshToken(request, reply)
  );

  fastify.post(
    '/logout',
    { preHandler: [authenticate] },
    (request, reply) => userController.logout(request as any, reply)
  );

  // ─── User CRUD (protected) ─────────────────────────────────────────────────
  fastify.get(
    '/me',
    { preHandler: [authenticate] },
    (request, reply) => userController.getCurrentUser(request as any, reply)
  );

  fastify.get(
    '/',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => userController.getAllUsers(request, reply)
  );

  fastify.get(
    '/:id',
    { preHandler: [authenticate] },
    (request, reply) => userController.getUserById(request, reply)
  );

  fastify.post(
    '/',
    { schema: createUserSchema },
    (request, reply) => userController.createUser(request, reply)
  );

  fastify.put(
    '/:id',
    { preHandler: [authenticate], schema: updateUserSchema },
    (request, reply) => userController.updateUser(request, reply)
  );

  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => userController.deleteUser(request, reply)
  );
}