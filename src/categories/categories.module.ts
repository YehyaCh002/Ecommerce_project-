import { Module } from '@nestjs/common';
import { CategoryService } from '../services/CategoryService';
import { CategoriesController } from './categories.controller';

@Module({
  controllers: [CategoriesController],
  providers: [{ provide: CategoryService, useFactory: () => new CategoryService() }],
})
export class CategoriesModule {}
