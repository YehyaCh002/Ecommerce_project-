import { Module } from '@nestjs/common';
import { UserService } from '../services/UserService';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [{ provide: UserService, useFactory: () => new UserService() }],
})
export class UsersModule {}