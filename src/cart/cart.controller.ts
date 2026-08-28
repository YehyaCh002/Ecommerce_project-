import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types';
import { CartService } from '../services/CartService';
import { AddCartItemDto } from './dto/add-cart-item.dto';

type UserContext = { id: any; role: string };

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private resolveUserId(user: UserContext | undefined, body: any): string | undefined {
    return user?.id ?? (body?.userId ? String(body.userId) : undefined);
  }

  private requireUserId(userId: string | undefined): string {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }
    return userId;
  }

  @Get()
  async getCart(@CurrentUser() user: UserContext | undefined, @Req() req: AuthenticatedRequest) {
    const body = (req.body as any) || {};
    const userId = this.requireUserId(this.resolveUserId(user, body));

    const cart = await this.cartService.getCartByUserId(userId);
    return { success: true, data: cart };
  }

  @Get('total')
  async getCartTotal(
    @CurrentUser() user: UserContext | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const body = (req.body as any) || {};
    const userId = this.requireUserId(this.resolveUserId(user, body));

    const total = await this.cartService.getCartTotal(userId);
    return { success: true, data: { total } };
  }

  @Post('items')
  @HttpCode(200)
  async addItemToCart(@CurrentUser() user: UserContext | undefined, @Body() dto: AddCartItemDto) {
    try {
      const userId = this.requireUserId(user?.id);
      const cart = await this.cartService.addItemToCart(
        userId,
        parseInt(String(dto.productId), 10),
        dto.quantity,
      );
      return { success: true, data: cart };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Put('items/:itemId')
  async updateCartItem(
    @CurrentUser() user: UserContext | undefined,
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    const body = (req.body as any) || {};
    const userId = this.requireUserId(this.resolveUserId(user, body));

    const cart = await this.cartService.updateCartItem(userId, parseInt(itemId, 10), body.quantity);
    return { success: true, data: cart };
  }

  @Delete('items/:itemId')
  async removeItemFromCart(
    @CurrentUser() user: UserContext | undefined,
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    const body = (req.body as any) || {};
    const userId = this.requireUserId(this.resolveUserId(user, body));

    const cart = await this.cartService.removeItemFromCart(userId, parseInt(itemId, 10));
    return { success: true, data: cart };
  }

  @Delete()
  async clearCart(@CurrentUser() user: UserContext | undefined, @Req() req: AuthenticatedRequest) {
    const body = (req.body as any) || {};
    const userId = this.requireUserId(this.resolveUserId(user, body));

    await this.cartService.clearCart(userId);
    return { success: true, message: 'Cart cleared successfully' };
  }
}
