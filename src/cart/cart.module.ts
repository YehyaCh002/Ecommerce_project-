import { Module } from '@nestjs/common';
import { CartService } from '../services/CartService';
import { CartController } from './cart.controller';

@Module({
  controllers: [CartController],
  providers: [{ provide: CartService, useFactory: () => new CartService() }],
})
export class CartModule {}