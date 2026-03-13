import { FastifyRequest, FastifyReply } from 'fastify';
import { CartService } from '../services/CartService';

type AuthRequest = FastifyRequest & {
  userId?: string;
};

export class CartController {
  private cartService = new CartService();

  getCart = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userId = req.userId || body.userId;
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const cart = await this.cartService.getCartByUserId(userId);
      res.status(200).send({
        success: true,
        data: cart,
      });
    } catch (error) {
      throw error;
    }
  };

  addItemToCart = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userId = req.userId || body.userId;
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const { productId, quantity } = body;
      const cart = await this.cartService.addItemToCart(
        userId,
        productId,
        quantity
      );
      res.status(200).send({
        success: true,
        data: cart,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).send({
          success: false,
          message: error.message,
        });
        return;
      }
      throw error;
    }
  };

  updateCartItem = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userId = req.userId || body.userId;
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const { quantity } = body;
      const { itemId } = req.params as { itemId: string };
      const cart = await this.cartService.updateCartItem(
        userId,
        itemId,
        quantity
      );
      res.status(200).send({
        success: true,
        data: cart,
      });
    } catch (error) {
      throw error;
    }
  };

  removeItemFromCart = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userId = req.userId || body.userId;
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const { itemId } = req.params as { itemId: string };
      const cart = await this.cartService.removeItemFromCart(
        userId,
        itemId
      );
      res.status(200).send({
        success: true,
        data: cart,
      });
    } catch (error) {
      throw error;
    }
  };

  clearCart = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userId = req.userId || body.userId;
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      await this.cartService.clearCart(userId);
      res.status(200).send({
        success: true,
        message: 'Cart cleared successfully',
      });
    } catch (error) {
      throw error;
    }
  };

  getCartTotal = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userId = req.userId || body.userId;
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const total = await this.cartService.getCartTotal(userId);
      res.status(200).send({
        success: true,
        data: { total },
      });
    } catch (error) {
      throw error;
    }
  };
}
