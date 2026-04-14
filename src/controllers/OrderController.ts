import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderService } from '../services/OrderService';
import { OrderStatus } from '../entities/Order';
import { OrderAction } from '../entities/OrderHistory';

type AuthRequest = FastifyRequest & {
  userId?: number;
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
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);
      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const { shippingAddress, paymentMethod, notes, remark, internalComment, shippingFee } = body;
      const order = await this.orderService.createOrderFromCart(
        userId,
        shippingAddress,
        paymentMethod,
        remark || notes,
        internalComment,
        shippingFee
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
      const { customerInfo, items, paymentMethod, notes, remark, internalComment, shippingFee } = req.body as any;

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
        remark || notes,
        internalComment,
        shippingFee,
        customerInfo.deliveryType || (req.body as any).deliveryType,
        customerInfo.soldFromStore !== undefined ? customerInfo.soldFromStore : (req.body as any).soldFromStore
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
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);
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

      const query = (req.query as any) || {};
      const filters = {
        cancellationStatus: query.cancellationStatus,
        isPotentialDuplicate:
          query.isPotentialDuplicate === 'true'
            ? true
            : query.isPotentialDuplicate === 'false'
            ? false
            : undefined,
      };

      const orders = await this.orderService.getAllOrders(filters);
      res.status(200).send({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      throw error;
    }
  };

  updateOrder = async (
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

      const { id } = req.params as { id: string };
      const { updateData, note } = body;

      const order = await this.orderService.updateOrder(
        parseInt(id),
        updateData,
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

  updateOrderPlatform = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const { platformId } = req.body as { platformId: string };

      if (!platformId) {
        res.status(400).send({
          success: false,
          message: 'Platform ID is required',
        });
        return;
      }

      const order = await this.orderService.updateOrderDeliveryPlatform(
        parseInt(id),
        parseInt(platformId, 10),
        req.userId
      );

      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      res.status(400).send({
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to assign platform',
      });
    }
  };
   

  cancelOrder = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = (req.body as any) || {};
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);
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

  requestCancellation = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);
      
      const order = await this.orderService.requestCancellation(parseInt(id), body.reason, userId);
      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  requestExchange = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);

      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const order = await this.orderService.requestExchange(
        parseInt(id, 10),
        userId,
        body.reason
      );

      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  approveExchange = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const userRole = req.userRole || body.userRole;
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);

      if (userRole !== 'admin') {
        res.status(403).send({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const order = await this.orderService.approveExchange(
        parseInt(id, 10),
        userId,
        body.note
      );

      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  rejectExchange = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const userRole = req.userRole || body.userRole;
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);

      if (userRole !== 'admin') {
        res.status(403).send({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      if (!userId) {
        res.status(401).send({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const order = await this.orderService.rejectExchange(
        parseInt(id, 10),
        userId,
        body.note
      );

      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  confirmCancellation = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const userRole = req.userRole || body.userRole;
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);

      if (userRole !== 'admin') {
        res.status(403).send({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const order = await this.orderService.confirmCancellation(parseInt(id), userId);
      res.status(200).send({
        success: true,
        data: order,
      });
    } catch (error) {
      throw error;
    }
  };

  rejectCancellation = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const userRole = req.userRole || body.userRole;
      const userId = req.userId || (body.userId ? parseInt(body.userId, 10) : undefined);

      if (userRole !== 'admin') {
        res.status(403).send({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const order = await this.orderService.rejectCancellation(parseInt(id), userId);
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
        action: OrderAction;
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

  getConfirmationStats = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const stats = await this.orderService.getConfirmationStats();
      res.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Failed to fetch confirmation stats',
      });
    }
  };

  getCommandesStatistics = async (
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

      const query = (req.query as any) || {};
      const data = await this.orderService.getCommandesStatistics({
        tab: query.tab,
        startDate: query.startDate,
        endDate: query.endDate,
        assignedToId: query.assignedToId
          ? parseInt(query.assignedToId, 10)
          : undefined,
        status: query.status,
        search: query.search,
      });

      res.status(200).send({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch commandes statistics',
      });
    }
  };

  getRetoursStatistics = async (
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

      const query = (req.query as any) || {};
      const data = await this.orderService.getRetoursStatistics({
        startDate: query.startDate,
        endDate: query.endDate,
        assignedToId: query.assignedToId
          ? parseInt(query.assignedToId, 10)
          : undefined,
        platformId: query.platformId ? parseInt(query.platformId, 10) : undefined,
        wilayaId: query.wilayaId ? parseInt(query.wilayaId, 10) : undefined,
        search: query.search,
      });

      res.status(200).send({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch retours statistics',
      });
    }
  };

  getEchecsStatistics = async (
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

      const query = (req.query as any) || {};
      const data = await this.orderService.getEchecsStatistics({
        startDate: query.startDate,
        endDate: query.endDate,
        assignedToId: query.assignedToId
          ? parseInt(query.assignedToId, 10)
          : undefined,
        platformId: query.platformId ? parseInt(query.platformId, 10) : undefined,
        wilayaId: query.wilayaId ? parseInt(query.wilayaId, 10) : undefined,
        search: query.search,
      });

      res.status(200).send({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch echecs statistics',
      });
    }
  };

  getWilayaTrackingOrders = async (
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

      const orders = await this.orderService.getWilayaTrackingOrders();
      res.status(200).send({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Failed to fetch wilaya tracking orders',
      });
    }
  };

  getReclamationOrders = async (
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

      const query = (req.query as any) || {};
      const result = await this.orderService.getReclamationOrders({
        type: query.type,
        search: query.search,
        platformId: query.platformId ? parseInt(query.platformId, 10) : undefined,
        wilayaId: query.wilayaId ? parseInt(query.wilayaId, 10) : undefined,
        status: query.status,
      });

      res.status(200).send({
        success: true,
        data: result.orders,
        count: result.orders.length,
        summary: result.summary,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch reclamation orders',
      });
    }
  };

  addTrackingLog = async (
    req: AuthRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const { status, subStatus, description, location, actor } = req.body as any;

      if (!status) {
        res.status(400).send({
          success: false,
          message: 'Status is required',
        });
        return;
      }

      const log = await this.orderService.addTrackingLog(
        parseInt(id),
        status,
        subStatus,
        description,
        location,
        actor
      );

      res.status(201).send({
        success: true,
        data: log,
      });
    } catch (error) {
      res.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add tracking log',
      });
    }
  };
}
