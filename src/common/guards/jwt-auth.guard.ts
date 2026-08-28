import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Check for token in cookies first, fallback to Authorization header
    let token = request.cookies?.accessToken;

    if (!token) {
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required. Missing token.');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: any; role: string };
      request.user = { id: decoded.id, role: decoded.role };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
