import { Module } from '@nestjs/common';
import { OrderService } from '../services/OrderService';
import { OrdersController } from './orders.controller';

@Module({
  controllers: [OrdersController],
  providers: [{ provide: OrderService, useFactory: () => new OrderService() }],
})
export class OrdersModule {}