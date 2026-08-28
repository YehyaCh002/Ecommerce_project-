import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DeliveryPlatformService } from '../services/DeliveryPlatformService';

@Controller('delivery-platforms')
export class DeliveryPlatformsController {
  constructor(private readonly platformService: DeliveryPlatformService) {}

  // Public/All staff could see platforms (to select one for an order)
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllPlatforms() {
    const platforms = await this.platformService.getAllPlatforms();
    return { success: true, data: platforms };
  }

  // Admin-only management
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createPlatform(@Body() body: any) {
    if (!body.name) {
      throw new BadRequestException('Platform name is required');
    }
    try {
      const platform = await this.platformService.createPlatform(body);
      return { success: true, data: platform };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create platform',
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updatePlatform(@Param('id') id: string, @Body() body: any) {
    try {
      const platform = await this.platformService.updatePlatform(
        parseInt(id, 10),
        body,
      );
      if (!platform) {
        throw new NotFoundException('Platform not found');
      }
      return { success: true, data: platform };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to update platform',
      );
    }
  }
}