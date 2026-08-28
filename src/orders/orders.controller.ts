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
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedRequest } from '../common/types';
import { OrderStatus } from '../entities/Order';
import { OrderAction } from '../entities/OrderHistory';
import { OrderService } from '../services/OrderService';
import { CreateOrderDto } from './dto/create-order.dto';
import { QuickOrderDto } from './dto/quick-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  // Deps helper: prefer authenticated user id, fallback to body userId.
  private resolveUserId(req: AuthenticatedRequest, body: any): any {
    const id = req.user?.id;
    if (id !== undefined && id !== null) {
      return id;
    }
    return body.userId ? String(body.userId) : undefined;
  }

  // ─── Public / test ─────────────────────────────────────────────────────────
  @Get('test')
  getTestRoute() {
    return { message: 'Test route working!' };
  }

  // ─── Customer routes ───────────────────────────────────────────────────────
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    const body = dto as any;
    const userId = this.resolveUserId(req, body);
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    const { shippingAddress, paymentMethod, notes, remark, internalComment, shippingFee, phoneNumber, customerName } = body;

    if (!phoneNumber) {
      throw new BadRequestException('Phone number is required');
    }

    if (!customerName) {
      throw new BadRequestException('Customer name is required');
    }

    const order = await this.orderService.createOrderFromCart(
      userId,
      phoneNumber,
      customerName,
      shippingAddress,
      paymentMethod,
      remark || notes,
      internalComment,
      shippingFee,
    );
    return { success: true, data: order };
  }

  @Post('quick-order')
  @HttpCode(201)
  async createQuickOrder(
    @Body() dto: QuickOrderDto,
    @Req() req: FastifyRequest,
  ) {
    const body = req.body as any;
    const { customerInfo, items, paymentMethod, notes, remark, internalComment, shippingFee } = body;

    if (!customerInfo || !customerInfo.name || !customerInfo.phoneNumber) {
      throw new BadRequestException('Customer name and phone number are required');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const order = await this.orderService.createGuestOrder(
      customerInfo,
      items,
      paymentMethod,
      remark || notes,
      internalComment,
      shippingFee,
      customerInfo.deliveryType || body.deliveryType,
      customerInfo.soldFromStore !== undefined ? customerInfo.soldFromStore : body.soldFromStore,
    );

    return { success: true, data: order };
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(@Req() req: AuthenticatedRequest) {
    const body = ((req.body as any) || {});
    const userId = this.resolveUserId(req, body);
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    const orders = await this.orderService.getOrdersByUserId(userId);
    return { success: true, data: orders, count: orders.length };
  }

  // ─── Vendor returns ────────────────────────────────────────────────────────
  @Post('vendor-returns/batches')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createVendorReturnBatch(@Req() req: AuthenticatedRequest) {
    const body = (req.body as any) || {};
    const trackingNumbers = Array.isArray(body.trackingNumbers)
      ? body.trackingNumbers
      : [];

    const data = await this.orderService.createVendorReturnBatch({
      dischargeReference: body.dischargeReference,
      trackingNumbers,
      deliveryPlatformId: body.deliveryPlatformId
        ? parseInt(String(body.deliveryPlatformId), 10)
        : undefined,
      notes: body.notes,
      createdByUserId: this.resolveUserId(req, body),
    });

    return { success: true, data };
  }

  @Get('vendor-returns/batches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getVendorReturnBatchSummary(@Param('id') id: string) {
    try {
      const data = await this.orderService.getVendorReturnBatchSummary(
        parseInt(id, 10),
      );
      return { success: true, data };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to fetch vendor return batch',
      );
    }
  }

  @Post('vendor-returns/batches/:id/scan')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async scanVendorReturnParcel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const body = (req.body as any) || {};
    const data = await this.orderService.scanVendorReturnParcel({
      batchId: parseInt(id, 10),
      trackingNumber: body.trackingNumber,
      scannedByUserId: this.resolveUserId(req, body),
    });
    return { success: true, data };
  }

  @Post('vendor-returns/batches/:id/close')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async closeVendorReturnBatch(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const body = (req.body as any) || {};
    const data = await this.orderService.closeVendorReturnBatch({
      batchId: parseInt(id, 10),
      closedByUserId: this.resolveUserId(req, body),
      note: body.note,
    });
    return { success: true, data };
  }

  // ─── Basic order access ────────────────────────────────────────────────────
  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    const order = await this.orderService.getOrderById(parseInt(id));
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return { success: true, data: order };
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  async getOrderHistory(@Param('id') id: string) {
    const history = await this.orderService.getOrderHistory(parseInt(id));
    return { success: true, data: history };
  }

  // ─── Cancellation flow ─────────────────────────────────────────────────────
  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const userId = this.resolveUserId(req, body);
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    const order = await this.orderService.cancelOrder(parseInt(id), userId);
    return { success: true, data: order };
  }

  @Post(':id/cancel-request')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async requestCancellation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const body = (req.body as any) || {};
    const userId = this.resolveUserId(req, body);

    const order = await this.orderService.requestCancellation(
      parseInt(id),
      body.reason,
      userId,
    );
    return { success: true, data: order };
  }

  @Post(':id/cancel-confirm')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async confirmCancellation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const userId = this.resolveUserId(req, body);
    const order = await this.orderService.confirmCancellation(parseInt(id), userId);
    return { success: true, data: order };
  }

  @Post(':id/cancel-reject')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async rejectCancellation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const userId = this.resolveUserId(req, body);
    const order = await this.orderService.rejectCancellation(parseInt(id), userId);
    return { success: true, data: order };
  }

  // ─── Exchange flow ─────────────────────────────────────────────────────────
  @Post(':id/exchange/request')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async requestExchange(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const userId = this.resolveUserId(req, body);

    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    const order = await this.orderService.requestExchange(
      parseInt(id),
      userId,
      body.reason,
    );

    return { success: true, data: order };
  }

  @Post(':id/exchange/approve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async approveExchange(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const userId = this.resolveUserId(req, body);

    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    const order = await this.orderService.approveExchange(
      parseInt(id),
      userId,
      body.note,
    );

    return { success: true, data: order };
  }

  @Post(':id/exchange/reject')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async rejectExchange(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const userId = this.resolveUserId(req, body);

    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    const order = await this.orderService.rejectExchange(
      parseInt(id),
      userId,
      body.note,
    );

    return { success: true, data: order };
  }

  // ─── Admin routes ──────────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllOrders(@Req() req: AuthenticatedRequest) {
    const body = (req.body as any) || {};
    if ((req.user?.role ?? body.userRole) !== 'admin') {
      throw new BadRequestException('Admin access required');
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
    return { success: true, data: orders, count: orders.length };
  }

  @Patch(':id/status')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateOrderStatus(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    if ((req.user?.role ?? body.userRole) !== 'admin') {
      throw new BadRequestException('Admin access required');
    }

    const { status } = body;
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException('Invalid order status');
    }

    const { note } = body;
    const order = await this.orderService.updateOrderStatus(
      parseInt(id),
      status,
      this.resolveUserId(req, body),
      note,
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { success: true, data: order };
  }

  @Put(':id/update')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    const body = dto as any;
    if ((req.user?.role ?? body.userRole) !== 'admin') {
      throw new BadRequestException('Admin access required');
    }

    const { updateData, note } = body;
    const order = await this.orderService.updateOrder(
      parseInt(id),
      updateData,
      this.resolveUserId(req, body),
      note,
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { success: true, data: order };
  }

  // Backward compatibility for existing clients using PUT /orders/:id
  @Put(':id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateOrderAlias(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.updateOrder(req, id, dto);
  }

  @Post(':id/history')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async logOrderAction(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const { action, details } = body as {
      action: OrderAction;
      details?: string;
    };

    const history = await this.orderService.logOrderAction(
      parseInt(id),
      action,
      this.resolveUserId(req, body),
      details,
    );

    return { success: true, data: history };
  }

  @Patch(':id/platform')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateOrderPlatform(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const { platformId } = body;

    if (!platformId) {
      throw new BadRequestException('Platform ID is required');
    }

    const order = await this.orderService.updateOrderDeliveryPlatform(
      parseInt(id),
      parseInt(platformId, 10),
      this.resolveUserId(req, body),
    );

    return { success: true, data: order };
  }

  @Post(':id/tracking-log')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async addTrackingLog(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const body = (req.body as any) || {};
    const { status, subStatus, description, location, actor } = body;

    if (!status) {
      throw new BadRequestException('Status is required');
    }

    const log = await this.orderService.addTrackingLog(
      parseInt(id),
      status,
      subStatus,
      description,
      location,
      actor,
    );

    return { success: true, data: log };
  }

  // ─── Stats & dashboards ────────────────────────────────────────────────────
  @Get('wilaya-tracking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getWilayaTrackingOrders() {
    try {
      const orders = await this.orderService.getWilayaTrackingOrders();
      return { success: true, data: orders, count: orders.length };
    } catch (error) {
      throw error;
    }
  }

  @Get('reclamations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getReclamationOrders(@Query() query: any) {
    const result = await this.orderService.getReclamationOrders({
      type: query.type,
      search: query.search,
      platformId: query.platformId ? parseInt(query.platformId, 10) : undefined,
      wilayaId: query.wilayaId ? parseInt(query.wilayaId, 10) : undefined,
      status: query.status,
    });

    return {
      success: true,
      data: result.orders,
      count: result.orders.length,
      summary: result.summary,
    };
  }

  @Get('stats/confirmation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getConfirmationStats() {
    const stats = await this.orderService.getConfirmationStats();
    return { success: true, data: stats };
  }

  @Get('stats/commandes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getCommandesStatistics(@Query() query: any) {
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

    return { success: true, data };
  }

  @Get('stats/retours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getRetoursStatistics(@Query() query: any) {
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

    return { success: true, data };
  }

  @Get('stats/echecs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getEchecsStatistics(@Query() query: any) {
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

    return { success: true, data };
  }

  @Get('stats/vente-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getVenteStockStatistics(@Query() query: any) {
    const statuses = query.statuses
      ? String(query.statuses)
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined;

    const data = await this.orderService.getVenteStockStatistics({
      statuses,
      startDate: query.startDate,
      endDate: query.endDate,
      categorySearch: query.categorySearch,
      productSearch: query.productSearch,
    });

    return { success: true, data };
  }
}