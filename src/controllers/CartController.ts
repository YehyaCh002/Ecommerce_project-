import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/CartService';

interface AuthRequest extends Request {
  userId?: string;
}

export class CartController {
  private cartService = new CartService();

  getCart = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const cart = await this.cartService.getCartByUserId(userId);
      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  addItemToCart = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const { productId, quantity } = req.body;
      const cart = await this.cartService.addItemToCart(
        userId,
        productId,
        quantity
      );
      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCartItem = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const { quantity } = req.body;
      const cart = await this.cartService.updateCartItem(
        userId,
        req.params.itemId,
        quantity
      );
      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  removeItemFromCart = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const cart = await this.cartService.removeItemFromCart(
        userId,
        req.params.itemId
      );
      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  clearCart = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      await this.cartService.clearCart(userId);
      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getCartTotal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const total = await this.cartService.getCartTotal(userId);
      res.status(200).json({
        success: true,
        data: { total },
      });
    } catch (error) {
      next(error);
    }
  };
}
