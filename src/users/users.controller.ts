import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../common/cookies';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedRequest } from '../common/types';
import { UserService } from '../services/UserService';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // ─── Auth ──────────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { email, password } = body || {};
    if (!email || !password) {
      throw new Error('Invalid credentials');
    }

    const result = await this.userService.login(email, password);
    if (!result) {
      throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken, user } = result;
    const {
      password: _p,
      refreshToken: _r,
      oauthId: _oi,
      oauthProvider: _op,
      ...safeUser
    } = user as any;

    res.setCookie('accessToken', accessToken, accessTokenCookieOptions());
    res.setCookie('refreshToken', refreshToken, refreshTokenCookieOptions());

    return { success: true, data: { user: safeUser } };
  }

  @Post('refresh-token')
  @HttpCode(200)
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required in cookies');
    }

    const tokens = await this.userService.refreshTokens(refreshToken);
    if (!tokens) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    res.setCookie('accessToken', tokens.accessToken, accessTokenCookieOptions());
    if (tokens.refreshToken) {
      res.setCookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions());
    }

    return { success: true, message: 'Tokens refreshed' };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: { id: any; role: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    await this.userService.logout(user.id);

    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    return { success: true, message: 'Logged out successfully' };
  }

  // ─── User CRUD (protected) ─────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: { id: any; role: string }) {
    const found = await this.userService.getUserById(String(user.id));
    if (!found) {
      throw new NotFoundException('User not found');
    }
    const { password: _p, refreshToken: _r, ...safeUser } = found as any;
    return { success: true, data: safeUser };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers() {
    const users = await this.userService.getAllUsers();
    return { success: true, data: users };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { success: true, data: user };
  }

  @Post()
  @HttpCode(201)
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.userService.createUser(dto as any);
    return { success: true, data: user };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.userService.updateUser(id, dto as any);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { success: true, data: user };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteUser(@Param('id') id: string) {
    const success = await this.userService.deleteUser(id);
    if (!success) {
      throw new NotFoundException('User not found');
    }
    return { success: true, message: 'User deleted successfully' };
  }
}
