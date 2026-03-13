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
      const order = await this.orderService.updateOrderStatus(
        parseInt(id),
        status
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
}
