import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController';

export default async function userRoutes(fastify: FastifyInstance) {
  const userController = new UserController();

  fastify.get('/', (request, reply) => userController.getAllUsers(request, reply));
  fastify.get('/:id', (request, reply) => userController.getUserById(request, reply));
  fastify.post('/', (request, reply) => userController.createUser(request, reply));
  fastify.put('/:id', (request, reply) => userController.updateUser(request, reply));
  fastify.delete('/:id', (request, reply) => userController.deleteUser(request, reply));
}
