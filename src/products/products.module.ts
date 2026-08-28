import { Module } from '@nestjs/common';
import { ProductService } from '../services/ProductService';
import { ProductsController } from './products.controller';

@Module({
  controllers: [ProductsController],
  providers: [{ provide: ProductService, useFactory: () => new ProductService() }],
})
export class ProductsModule {}
