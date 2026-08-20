import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getCurrentUser(req: FastifyRequest & { userId?: string }, res: FastifyReply): Promise<void> {
    try {
      const user = await this.userService.getUserById(req.userId!);
      if (!user) {
        res.status(404).send({ success: false, message: 'User not found' });
        return;
      }
      const { password: _, refreshToken: __, ...safeUser } = user as any;
      res.send({ success: true, data: safeUser });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error fetching current user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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
      const user = await this.userService.getUserById(id);

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
      const user = await this.userService.updateUser(id, userData);

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
      const success = await this.userService.deleteUser(id);

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
      // req.user is populated by Passport's LocalStrategy (preValidation hook)
      const user = (req as any).user as import('../entities/User').User | undefined;
      if (!user) {
        res.status(401).send({ success: false, message: 'Invalid credentials' });
        return;
      }

      const { accessToken, refreshToken } = await this.userService.generateTokens(user);

      // remove sensitive data like password
      const { password: _, refreshToken: __, oauthId: _oi, oauthProvider: _op, ...safeUser } = user as any;

      res.setCookie('accessToken', accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 minutes
      });

      res.setCookie('refreshToken', refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      res.send({
        success: true,
        data: {
          user: safeUser,
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
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        res.status(400).send({ success: false, message: 'Refresh token is required in cookies' });
        return;
      }

      const tokens = await this.userService.refreshTokens(refreshToken);
      if (!tokens) {
        res.status(401).send({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      res.setCookie('accessToken', tokens.accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 minutes
      });

      if (tokens.refreshToken) {
        res.setCookie('refreshToken', tokens.refreshToken, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }

      res.send({
        success: true,
        message: 'Tokens refreshed'
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Error refreshing token',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async logout(req: FastifyRequest & { userId?: string }, res: FastifyReply): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).send({ success: false, message: 'Not authenticated' });
        return;
      }
      await this.userService.logout(userId);
      
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });

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


