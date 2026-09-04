import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ProductService } from '../services/ProductService';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductService) {}

  // Public routes
  @Get()
  async getAllProducts(@Query() query: any) {
    const filters = {
      categoryId: query.categoryId ? parseInt(query.categoryId as string, 10) : undefined,
      search: query.search as string,
      minPrice: query.minPrice ? parseFloat(query.minPrice as string) : undefined,
      maxPrice: query.maxPrice ? parseFloat(query.maxPrice as string) : undefined,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
    };

    const page = query.page ? parseInt(query.page as string, 10) : undefined;
    const limit = query.limit ? parseInt(query.limit as string, 10) : undefined;

    const result = await this.productService.getAllProducts(filters, { page, limit });
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

  // Inventory movement routes (must be declared before /:id)
  @Get('stock-movements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getStockMovements(@Query() query: any) {
    const types = query.types
      ? String(query.types)
          .split(',')
          .map((value: string) => value.trim())
          .filter(Boolean)
      : undefined;

    const movements = await this.productService.getStockMovements({
      types,
      startDate: query.startDate,
      endDate: query.endDate,
      categorySearch: query.categorySearch,
    });

    return { success: true, data: movements, count: movements.length };
  }

  @Get('stock-movements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getStockMovementDetails(@Param('id') id: string) {
    const movement = await this.productService.getStockMovementDetails(parseInt(id, 10));

    if (!movement) {
      throw new NotFoundException('Stock movement not found');
    }

    return { success: true, data: movement };
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    const product = await this.productService.getProductById(parseInt(id, 10));
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return { success: true, data: product };
  }

  // Admin routes
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createProduct(@Body() dto: CreateProductDto) {
    try {
      const product = await this.productService.createProduct(dto as any);
      return { success: true, data: product };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create product',
      );
    }
  }

  // Backward-compatible alias for older clients.
  @Post('addProd')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async addProductAlias(@Body() dto: CreateProductDto) {
    return this.createProduct(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    try {
      const product = await this.productService.updateProduct(parseInt(id, 10), dto as any);
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      return { success: true, data: product };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to update product',
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteProduct(@Param('id') id: string) {
    const deleted = await this.productService.deleteProduct(parseInt(id, 10));
    if (!deleted) {
      throw new NotFoundException('Product not found');
    }
    return { success: true, message: 'Product deleted successfully' };
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; type?: string; variantUpdates?: any[] },
  ) {
    try {
      const product = await this.productService.updateStock(parseInt(id, 10), body.quantity, {
        type: body.type,
        variantUpdates: body.variantUpdates,
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      return { success: true, data: product };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to update stock',
      );
    }
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateProductStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    try {
      const product = await this.productService.setProductActiveState(
        parseInt(id, 10),
        dto.isActive,
      );
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      return { success: true, data: product };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to update product status',
      );
    }
  }
}
