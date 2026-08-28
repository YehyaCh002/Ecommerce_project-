import { Module } from '@nestjs/common';
import { UserService } from '../services/UserService';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: UserService, useFactory: () => new UserService() },
    { provide: AuthService, useFactory: () => new AuthService() },
  ],
})
export class AuthModule {}
