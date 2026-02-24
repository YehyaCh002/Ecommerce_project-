import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderStatus } from '../entities/Order';

interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export class OrderController {
  private orderService = new OrderService();

  createOrder = async (
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

      const { shippingAddress, paymentMethod, notes } = req.body;
      const order = await this.orderService.createOrderFromCart(
        userId,
        shippingAddress,
        paymentMethod,
        notes
      );
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.orderService.getOrderById(parseInt(req.params.id));
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserOrders = async (
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

      const orders = await this.orderService.getOrdersByUserId(userId);
      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllOrders = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userRole = req.userRole || req.body.userRole;
      if (userRole !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const orders = await this.orderService.getAllOrders();
      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      next(error);
    }
  };

  updateOrderStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userRole = req.userRole || req.body.userRole;
      if (userRole !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const { status } = req.body;
      if (!Object.values(OrderStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid order status',
        });
        return;
      }

      const order = await this.orderService.updateOrderStatus(
        parseInt(req.params.id),
        status
      );
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelOrder = async (
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

      const order = await this.orderService.cancelOrder(parseInt(req.params.id), userId);
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };
}
