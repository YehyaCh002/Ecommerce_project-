import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { createUserSchema, updateUserSchema } from '../schemas/userSchema';

export default async function userRoutes(fastify: FastifyInstance) {
  const userController = new UserController();

  // Admin only: Get all users
  fastify.get(
    '/',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => userController.getAllUsers(request, reply)
  );

  // User themselves or Admin: Get user by ID
  fastify.get(
    '/:id',
    { preHandler: [authenticate] },
    (request, reply) => userController.getUserById(request, reply)
  );
  
  // Public: Create user (register)
  fastify.post(
    '/',
    { schema: createUserSchema },
    (request, reply) => userController.createUser(request, reply)
  );

  // User themselves or Admin: Update user
  fastify.put(
    '/:id',
    { 
      preHandler: [authenticate],
      schema: updateUserSchema 
    },
    (request, reply) => userController.updateUser(request, reply)
  );

  // Admin only: Delete user
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireAdmin] },
    (request, reply) => userController.deleteUser(request, reply)
  );

  // Auth: Login
  fastify.post(
    '/login',
    (request, reply) => userController.login(request, reply)
  );

  // Auth: Refresh Token
  fastify.post(
    '/refresh-token',
    (request, reply) => userController.refreshToken(request, reply)
  );

  // Auth: Logout
  fastify.post(
    '/logout',
    { preHandler: [authenticate] },
    (request, reply) => userController.logout(request as any, reply)
  );
}
