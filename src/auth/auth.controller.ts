import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../common/cookies';
import { UserService } from '../services/UserService';
import { AuthService } from './auth.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3002/auth/google/callback';

const stubResponse = {
  success: false,
  message:
    'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      googleOAuth: GOOGLE_CLIENT_ID
        ? 'enabled'
        : 'disabled (set GOOGLE_CLIENT_ID env var)',
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('google')
  google(@Res() res: FastifyReply) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(501).send(stubResponse);
    }

    const params =
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('profile email')}` +
      `&access_type=offline`;

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: FastifyReply) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(501).send(stubResponse);
    }

    try {
      if (!code) {
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
      }

      const fetchImpl = (globalThis as any).fetch as (
        url: string,
        init?: any,
      ) => Promise<any>;

      const tokenResponse = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:
          `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
          `&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}` +
          `&code=${encodeURIComponent(code)}` +
          `&grant_type=authorization_code` +
          `&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}`,
      });

      if (!tokenResponse.ok) {
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
      }

      const oauthTokens = await tokenResponse.json();

      const userInfoResponse = await fetchImpl(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${oauthTokens.access_token}` } },
      );

      const profile = await userInfoResponse.json();

      const user = await this.authService.upsertGoogleUser(profile);

      const { accessToken, refreshToken } = await this.userService.generateTokens(user);

      res.setCookie('accessToken', accessToken, accessTokenCookieOptions());
      res.setCookie('refreshToken', refreshToken, refreshTokenCookieOptions());

      return res.redirect(`${FRONTEND_URL}/`);
    } catch (err) {
      return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
  }
}