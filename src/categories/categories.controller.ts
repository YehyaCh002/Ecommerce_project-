import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CategoryService } from '../services/CategoryService';
import { CategoryDto } from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryService: CategoryService) {}

  // Public routes
  @Get()
  async getAllCategories(@Query() query: any) {
    const page = query.page ? parseInt(query.page as string, 10) : undefined;
    const limit = query.limit ? parseInt(query.limit as string, 10) : undefined;

    const result = await this.categoryService.getAllCategories({ page, limit });
    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    const category = await this.categoryService.getCategoryById(parseInt(id, 10));
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return { success: true, data: category };
  }

  // Admin routes
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createCategory(@Body() dto: CategoryDto) {
    try {
      const category = await this.categoryService.createCategory(dto as any);
      return { success: true, data: category };
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new ConflictException(error.message);
      }
      if (error instanceof Error && error.message.includes('Parent category not found')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateCategory(@Param('id') id: string, @Body() dto: CategoryDto) {
    const category = await this.categoryService.updateCategory(parseInt(id, 10), dto as any);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return { success: true, data: category };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteCategory(@Param('id') id: string) {
    const deleted = await this.categoryService.deleteCategory(parseInt(id, 10));
    if (!deleted) {
      throw new NotFoundException('Category not found');
    }
    return { success: true, message: 'Category deleted successfully' };
  }
}
