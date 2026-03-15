import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController';
import { createUserSchema, updateUserSchema } from '../schemas/userSchema';

export default async function userRoutes(fastify: FastifyInstance) {
  const userController = new UserController();

  fastify.get('/', (request, reply) => userController.getAllUsers(request, reply));
  fastify.get('/:id', (request, reply) => userController.getUserById(request, reply));
  
  fastify.post(
    '/',
    { schema: createUserSchema },
    (request, reply) => userController.createUser(request, reply)
  );

  fastify.put(
    '/:id',
    { schema: updateUserSchema },
    (request, reply) => userController.updateUser(request, reply)
  );

  fastify.delete('/:id', (request, reply) => userController.deleteUser(request, reply));
}
