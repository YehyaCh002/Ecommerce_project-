import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getAllUsers(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.send({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error fetching users',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getUserById(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const user = await this.userService.getUserById(parseInt(id, 10));

      if (!user) {
        res.status(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.send({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error fetching user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createUser(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
      const userData = req.body as any;
      const user = await this.userService.createUser(userData);

      res.status(201).send({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error creating user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateUser(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const userData = req.body as any;
      const user = await this.userService.updateUser(parseInt(id, 10), userData);

      if (!user) {
        res.status(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.send({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error updating user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteUser(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const deleted = await this.userService.deleteUser(parseInt(id, 10));

      if (!deleted) {
        res.status(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.send({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error deleting user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
