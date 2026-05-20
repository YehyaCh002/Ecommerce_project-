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
      const success = await this.userService.deleteUser(parseInt(id, 10));

      if (!success) {
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

  async login(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
      const { email, password } = req.body as any;
      if (!email || !password) {
        res.status(400).send({ success: false, message: 'Email and password are required' });
        return;
      }

      const result = await this.userService.login(email, password);
      if (!result) {
        res.status(401).send({ success: false, message: 'Invalid credentials' });
        return;
      }

      const { user, accessToken, refreshToken } = result;
      // remove sensitive data like password
      const { password: _, refreshToken: __, ...safeUser } = user;

      res.send({
        success: true,
        data: {
          user: safeUser,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error during login',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async refreshToken(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      if (!refreshToken) {
        res.status(400).send({ success: false, message: 'Refresh token is required' });
        return;
      }

      const tokens = await this.userService.refreshTokens(refreshToken);
      if (!tokens) {
        res.status(401).send({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      res.send({
        success: true,
        data: tokens,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error refreshing token',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async logout(req: FastifyRequest & { userId?: number }, res: FastifyReply): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).send({ success: false, message: 'Not authenticated' });
        return;
      }
      
      await this.userService.logout(userId);
      res.send({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error during logout',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}


