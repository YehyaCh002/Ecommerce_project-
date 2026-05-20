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

  async getUserById(id: number): Promise<User | null> {
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

  async updateUser(id: number, userData: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, userData);
    return await this.getUserById(id);
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return result.affected !== 0;
  }

  async login(email: string, password: string): Promise<{ user: User, accessToken: string, refreshToken: string } | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return await this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string, refreshToken: string } | null> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: number };
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

  async logout(userId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (user) {
      user.refreshToken = null;
      await this.userRepository.save(user);
      return true;
    }
    return false;
  }

  private async generateTokens(user: User): Promise<{ user: User, accessToken: string, refreshToken: string }> {
    const payload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return { user, accessToken, refreshToken };
  }
}
