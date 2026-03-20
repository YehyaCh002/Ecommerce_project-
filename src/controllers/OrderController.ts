import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderService } from '../services/OrderService';
import { OrderStatus } from '../entities/Order';

type AuthRequest = FastifyRequest & {
  userId?: string;
  userRole?: string;
};

export class OrderController {
  private orderService = new OrderService();

  createOrder = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = req.body as any;
      const userId = req.userId || body.userId;
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const { shippingAddress, paymentMethod, notes } = body;
      const order = await this.orderService.createOrderFromCart(
        userId,
        shippingAddress,
        paymentMethod,
        notes
      );
      res.status(201).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  createQuickOrder = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { customerInfo, items, paymentMethod, notes } = req.body as any;

      if (!customerInfo || !customerInfo.name || !customerInfo.phoneNumber) {
        res.status(400).send({
          success: false,
          message: 'Customer name and phone number are required',
        });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).send({
          success: false,
          message: 'Order must contain at least one item',
        });
        return;
      }

      const order = await this.orderService.createGuestOrder(
        customerInfo,
        items,
        paymentMethod,
        notes
      );

      res.status(201).send({
        success: true,
        data: order,
      });
    } catch (error) {
      res.status(400).send({
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create order',
      });
    }
  };


  getOrderById = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const order = await this.orderService.getOrderById(parseInt(id));
      if (!order) {
        res.status(404).send({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  getUserOrders = async (
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

      const orders = await this.orderService.getOrdersByUserId(userId);
      res.status(200).send({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      throw error;
    }
  };

  getAllOrders = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userRole = req.userRole || body.userRole;
      if (userRole !== 'admin') {
        res.status(403).send({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const orders = await this.orderService.getAllOrders();
      res.status(200).send({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      throw error;
    }
  };

  updateOrderStatus = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userRole = req.userRole || body.userRole;
      if (userRole !== 'admin') {
        res.status(403).send({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const { status } = body;
      if (!Object.values(OrderStatus).includes(status)) {
        res.status(400).send({
          success: false,
          message: 'Invalid order status',
        });
        return;
      }

      const { id } = req.params as { id: string };
      const { note } = body;
      const order = await this.orderService.updateOrderStatus(
        parseInt(id),
        status,
        req.userId,
        note
      );
      if (!order) {
        res.status(404).send({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  cancelOrder = async (
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

      const { id } = req.params as { id: string };
      const order = await this.orderService.cancelOrder(parseInt(id), userId);
      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  getOrderHistory = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const history = await this.orderService.getOrderHistory(parseInt(id));
      res.status(200).send({
        success: true,
        data: history,
      });
    } catch (error) {
      throw error;
    }
  };

  logOrderAction = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const { action, details } = req.body as {
        action: string;
        details?: string;
      };

      const history = await this.orderService.logOrderAction(
        parseInt(id),
        action,
        req.userId,
        details
      );

      res.status(201).send({
        success: true,
        data: history,
      });
    } catch (error) {
      throw error;
    }
  };
}
