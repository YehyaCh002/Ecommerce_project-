import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_key_here';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const userToCreate = { ...userData };
    if (userToCreate.password) {
      userToCreate.password = await bcrypt.hash(userToCreate.password, 10);
    }
    const user = this.userRepository.create(userToCreate);
    return await this.userRepository.save(user);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, userData as any);
    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id as any);
    return result.affected !== 0;
  }

  /**
   * Validate email + password credentials.
   * Called directly by the LocalStrategy verify callback in passport.ts.
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return null;

    if (!user.password) return null; // OAuth-only account

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return await this.generateTokens(user);
  }

  /**
   * Issue JWT tokens for any authenticated user (local or OAuth).
   * Public so controllers can call it after Passport sets req.user.
   */
  async generateTokens(
    user: User
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const payload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return { user, accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
      const user = await this.getUserById(decoded.id);

      if (!user || user.refreshToken !== refreshToken) {
        return null;
      }

      const tokens = await this.generateTokens(user);
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    } catch (error) {
      return null;
    }
  }

  async logout(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (user) {
      user.refreshToken = null;
      await this.userRepository.save(user);
      return true;
    }
    return false;
  }
}
