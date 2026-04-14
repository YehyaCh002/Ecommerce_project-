import { AppDataSource } from '../config/data-source';
import { Brackets, In, MoreThanOrEqual } from 'typeorm';
import {
  Order,
  OrderStatus,
  DeliveryType,
  ValidationOutcome,
  CancellationStatus
} from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderHistory, OrderAction } from '../entities/OrderHistory';
import { Customer } from '../entities/Customer';
import { DeliveryPlatform } from '../entities/DeliveryPlatform';
import { TrackingLog } from '../entities/TrackingLog';
import { CartService } from './CartService';
import { ProductService } from './ProductService';

export class OrderService {
  private static readonly EXCHANGE_WINDOW_DAYS = 3;
  orderRepository: any;
  orderItemRepository: any;
  orderHistoryRepository: any;
  customerRepository: any;
  platformRepository: any;
  trackingLogRepository: any;
  cartService: any;
  productService: any;

  constructor(
    orderRepository?: any,
    orderItemRepository?: any,
    orderHistoryRepository?: any,
    customerRepository?: any,
    platformRepository?: any,
    trackingLogRepository?: any,
    cartService?: any,
    productService?: any
  ) {
    this.orderRepository = orderRepository || AppDataSource.getRepository(Order);
    this.orderItemRepository = orderItemRepository || AppDataSource.getRepository(OrderItem);
    this.orderHistoryRepository = orderHistoryRepository || AppDataSource.getRepository(OrderHistory);
    this.customerRepository = customerRepository || AppDataSource.getRepository(Customer);
    this.platformRepository = platformRepository || AppDataSource.getRepository(DeliveryPlatform);
    this.trackingLogRepository = trackingLogRepository || AppDataSource.getRepository(TrackingLog);
    this.cartService = cartService || new CartService();
    this.productService = productService || new ProductService();
  }

  private async checkIsPotentialDuplicate(phoneNumber: string): Promise<boolean> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const existingOrder = await this.orderRepository.findOne({
      where: {
        phoneNumber,
        createdAt: MoreThanOrEqual(yesterday),
        status: In([
          OrderStatus.EN_ATTENTE,
          OrderStatus.NON_REPONDU_1ERE,
          OrderStatus.CONFIRME,
          OrderStatus.OTP_CONFIRME,
        ]),
      },
    });

    return !!existingOrder;
  }

  private assertExchangeEligibility(order: Order): void {
    if (order.status !== OrderStatus.LIVRE) {
      throw new Error('Exchange is only allowed for delivered orders');
    }

    if (!order.validatedAt) {
      throw new Error('Delivered date is missing for this order');
    }

    const exchangeWindowMs =
      OrderService.EXCHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const elapsedMs = Date.now() - new Date(order.validatedAt).getTime();

    if (elapsedMs > exchangeWindowMs) {
      throw new Error(
        `Exchange window expired. Exchanges are allowed only within ${OrderService.EXCHANGE_WINDOW_DAYS} days after delivery`
      );
    }
  }

  private async getLatestExchangeState(orderId: number): Promise<'none' | 'requested' | 'approved' | 'rejected'> {
    const historyEntries = await this.orderHistoryRepository.find({
      where: {
        orderId,
        action: OrderAction.EXCHANGE,
      },
      order: {
        timestamp: 'DESC',
      },
    });

    for (const entry of historyEntries) {
      const details = entry.details || '';
      if (details.startsWith('[EXCHANGE_REQUEST]')) return 'requested';
      if (details.startsWith('[EXCHANGE_APPROVED]')) return 'approved';
      if (details.startsWith('[EXCHANGE_REJECTED]')) return 'rejected';
    }

    return 'none';
  }

  async createOrderFromCart(
    userId: number,
    shippingAddress: string,
    paymentMethod: string,
    remark?: string,
    internalComment?: string,
    shippingFee: number = 0,
    customerEmail?: string,
    detailedAddress?: string,
    deliveryType?: DeliveryType,
    soldFromStore: boolean = false
  ): Promise<Order> {
    // Note: In the landing page context, this might be replaced by createGuestOrder
    const cart = await this.cartService.getCartByUserId(userId);

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate stock availability
    for (const item of cart.cartItems) {
      if (item.product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for product: ${item.product.name}`
        );
      }
    }

    // Calculate total
    const totalPrice = cart.cartItems.reduce((total: number, item: { product: { price: any; }; quantity: number; }) => {
      return total + Number(item.product.price) * item.quantity;
    }, 0);

    // Final total including shipping fee
    const finalTotalPrice = totalPrice + Number(shippingFee);

    const phoneNumber = '0000000000'; // TODO: Fetch real phone from user entity
    const isPotentialDuplicate = await this.checkIsPotentialDuplicate(phoneNumber);

    // Get user info for customer name and phone (you may need to adjust this)
    // For now, using placeholder values - you should fetch from user entity
    const order = this.orderRepository.create({
      userId,
      customerName: 'Customer', // TODO: Fetch from user entity
      phoneNumber,
      totalPrice: finalTotalPrice,
      shippingAddress,
      paymentMethod,
      remark,
      internalComment,
      shippingFee,
      customerEmail,
      detailedAddress,
      deliveryType,
      soldFromStore,
      status: OrderStatus.EN_ATTENTE,
      isPotentialDuplicate,
      source: 'Website' as any,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Initial history entry
    await this.addOrderHistory(
      savedOrder.id,
      OrderAction.CREATED,
      OrderStatus.EN_ATTENTE,
      userId,
      isPotentialDuplicate
        ? 'Order was placed successfully. Potential duplicate detected.'
        : 'Order was placed successfully.'
    );

    if (isPotentialDuplicate) {
      await this.addOrderHistory(
        savedOrder.id,
        OrderAction.POTENTIAL_DUPLICATE,
        OrderStatus.EN_ATTENTE,
        userId,
        'System detected another active order from the same phone number within 24 hours.'
      );
    }

    // Create order items and decrease stock
    for (const cartItem of cart.cartItems) {
      const orderItem = this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: cartItem.product.price,
      });

      await this.orderItemRepository.save(orderItem);
      await this.productService.decreaseStock(
        cartItem.productId,
        cartItem.quantity
      );
    }

    // Clear cart
    await this.cartService.clearCart(userId);

    return (await this.getOrderById(savedOrder.id)) as Order;
  }

  async createGuestOrder(
    customerInfo: {
      name: string;
      phoneNumber: string;
      email?: string;
      address?: string;
    },
    items: { productId: number; quantity: number; variantId?: number }[],
    paymentMethod: string,
    remark?: string,
    internalComment?: string,
    shippingFee: number = 0,
    deliveryType?: DeliveryType,
    soldFromStore: boolean = false
  ): Promise<Order> {
    // 1. Find or Create Customer
    let customer = await this.customerRepository.findOne({
      where: { phoneNumber: customerInfo.phoneNumber },
    });

    if (!customer) {
      customer = this.customerRepository.create({
        name: customerInfo.name,
        phoneNumber: customerInfo.phoneNumber,
        email: customerInfo.email,
        defaultAddress: customerInfo.address,
      });
      customer = await this.customerRepository.save(customer);
    } else {
      // Update info if it's an existing customer
      customer.name = customerInfo.name;
      if (customerInfo.email) customer.email = customerInfo.email;
      if (customerInfo.address) customer.defaultAddress = customerInfo.address;
      await this.customerRepository.save(customer);
    }

    // 2. Calculate Total and Validate Stock
    let totalPrice = 0;
    const validatedItems: { product: any; quantity: number; variant?: any }[] = [];

    for (const item of items) {
      const product = await this.productService.getProductById(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      let variant = null;
      if (item.variantId) {
        variant = product.variants?.find((v: { id: number | undefined; }) => v.id === item.variantId);
        if (!variant) throw new Error(`Variant not found for product: ${product.name}`);
        if (variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name} (Size/Color variant)`);
        }
      } else {
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
      }

      totalPrice += Number(variant?.priceOverride || product.price) * item.quantity;
      validatedItems.push({ product, quantity: item.quantity, variant });
    }

    // 3. Create Order
    const isPotentialDuplicate = await this.checkIsPotentialDuplicate(
      customer.phoneNumber
    );

    const order = this.orderRepository.create({
      customerId: customer.id,
      customerName: customer.name,
      phoneNumber: customer.phoneNumber,
      totalPrice: totalPrice + Number(shippingFee),
      shippingAddress: customerInfo.address,
      paymentMethod,
      remark,
      internalComment,
      shippingFee,
      customerEmail: customerInfo.email,
      detailedAddress: customerInfo.address,
      deliveryType,
      soldFromStore,
      status: OrderStatus.EN_ATTENTE,
      isPotentialDuplicate,
      source: 'Website' as any,
    });

    const savedOrder = await this.orderRepository.save(order);

    // 4. Update Customer Stats
    customer.totalOrdersCount += 1;
    await this.customerRepository.save(customer);

    // 5. Initial history entry
    await this.addOrderHistory(
      savedOrder.id,
      OrderAction.CREATED,
      OrderStatus.EN_ATTENTE,
      undefined,
      isPotentialDuplicate
        ? 'Order was placed from landing page. Potential duplicate detected.'
        : 'Order was placed from landing page.'
    );

    if (isPotentialDuplicate) {
      await this.addOrderHistory(
        savedOrder.id,
        OrderAction.POTENTIAL_DUPLICATE,
        OrderStatus.EN_ATTENTE,
        undefined,
        'System detected another active order from the same phone number within 24 hours.'
      );
    }

    // 6. Create order items and decrease stock
    for (const item of validatedItems) {
      const orderItem = this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: item.product.id,
        variantId: item.variant?.id,
        quantity: item.quantity,
        price: item.variant?.priceOverride || item.product.price,
      });

      await this.orderItemRepository.save(orderItem);

      if (item.variant) {
        await this.productService.decreaseVariantStock(item.variant.id, item.quantity);
      } else {
        await this.productService.decreaseStock(item.product.id, item.quantity);
      }
    }

    return (await this.getOrderById(savedOrder.id)) as Order;
  }

  async getOrderById(id: number): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'orderItems',
        'orderItems.product',
        'customer',
        'wilaya',
        'assignedTo',
      ],
    });

    if (order) {
      // Fetch history separately to ensure ordering
      order.history = await this.orderHistoryRepository.find({
        where: { orderId: id },
        order: { timestamp: 'ASC' },
        relations: ['changedByUser'],
      });
    }

    return order;
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['orderItems', 'orderItems.product', 'customer', 'wilaya', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllOrders(filters?: {
    cancellationStatus?: CancellationStatus;
    isPotentialDuplicate?: boolean;
  }): Promise<Order[]> {
    const where: any = {};
    if (filters?.cancellationStatus) {
      where.cancellationStatus = filters.cancellationStatus;
    }
    if (filters?.isPotentialDuplicate !== undefined) {
      where.isPotentialDuplicate = filters.isPotentialDuplicate;
    }

    return await this.orderRepository.find({
      where,
      relations: ['orderItems', 'orderItems.product', 'customer', 'wilaya', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  private hasFailedDeliverySignal(order: Order): boolean {
    const trackingStatus = (order.tracking_status || '').toLowerCase();
    const subStatus = (order.current_sub_status || '').toLowerCase();

    return (
      trackingStatus.includes('echou') ||
      trackingStatus.includes('échou') ||
      subStatus.includes('echou') ||
      subStatus.includes('échou')
    );
  }

  private hasUndefinedSignal(order: Order): boolean {
    const trackingStatus = (order.tracking_status || '').toLowerCase();
    const subStatus = (order.current_sub_status || '').toLowerCase();

    return (
      trackingStatus.includes('perdu') ||
      trackingStatus.includes('lost') ||
      trackingStatus.includes('missing') ||
      trackingStatus.includes('undefined') ||
      trackingStatus.includes('inconnu') ||
      subStatus.includes('perdu') ||
      subStatus.includes('lost') ||
      subStatus.includes('missing') ||
      subStatus.includes('undefined') ||
      subStatus.includes('inconnu')
    );
  }

  private hasOnAlertSignal(order: Order): boolean {
    const trackingStatus = (order.tracking_status || '').toLowerCase();
    const subStatus = (order.current_sub_status || '').toLowerCase();

    return (
      trackingStatus.includes('sorti') ||
      trackingStatus.includes('en livraison') ||
      trackingStatus.includes('out for delivery') ||
      trackingStatus.includes('delivery in progress') ||
      subStatus.includes('sorti') ||
      subStatus.includes('en livraison') ||
      subStatus.includes('out for delivery') ||
      subStatus.includes('delivery in progress')
    );
  }

  async getReclamationOrders(filters?: {
    type?: 'all' | 'cancellation' | 'exchange' | 'failed_delivery' | 'duplicate';
    search?: string;
    platformId?: number;
    wilayaId?: number;
    status?: string;
  }): Promise<{
    orders: Array<any>;
    summary: {
      total: number;
      cancellation: number;
      exchange: number;
      failedDelivery: number;
      duplicate: number;
    };
  }> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.wilaya', 'wilaya')
      .leftJoinAndSelect('order.assignedTo', 'assignedTo')
      .leftJoinAndSelect('order.deliveryPlatform', 'deliveryPlatform')
      .orderBy('order.createdAt', 'DESC');

    const type = filters?.type || 'all';

    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('CAST(order.id AS TEXT) ILIKE :search', { search: `%${filters.search}%` })
            .orWhere('order.customerName ILIKE :search', { search: `%${filters.search}%` })
            .orWhere('order.phoneNumber ILIKE :search', { search: `%${filters.search}%` })
            .orWhere("COALESCE(order.trackingNumber, '') ILIKE :search", {
              search: `%${filters.search}%`,
            });
        })
      );
    }

    if (filters?.platformId) {
      query.andWhere('order.deliveryPlatformId = :platformId', {
        platformId: filters.platformId,
      });
    }

    if (filters?.wilayaId) {
      query.andWhere('order.wilayaId = :wilayaId', {
        wilayaId: filters.wilayaId,
      });
    }

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (type === 'cancellation') {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('order.cancellationStatus IN (:...cancelStates)', {
            cancelStates: [CancellationStatus.REQUESTED, CancellationStatus.CONFIRMED],
          }).orWhere('order.status = :cancelledStatus', {
            cancelledStatus: OrderStatus.ANNULE,
          });
        })
      );
    } else if (type === 'exchange') {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('order.isExchange = true').orWhere(
            'order.validationOutcome = :exchangedOutcome',
            { exchangedOutcome: ValidationOutcome.EXCHANGED }
          );
        })
      );
    } else if (type === 'failed_delivery') {
      query.andWhere(
        new Brackets((qb) => {
          qb.where("LOWER(COALESCE(order.tracking_status, '')) LIKE :failedSearch", {
            failedSearch: '%echou%',
          })
            .orWhere("LOWER(COALESCE(order.current_sub_status, '')) LIKE :failedSearch", {
              failedSearch: '%echou%',
            })
            .orWhere("LOWER(COALESCE(order.tracking_status, '')) LIKE :failedSearchAccent", {
              failedSearchAccent: '%échou%',
            })
            .orWhere("LOWER(COALESCE(order.current_sub_status, '')) LIKE :failedSearchAccent", {
              failedSearchAccent: '%échou%',
            });
        })
      );
    } else if (type === 'duplicate') {
      query.andWhere('order.isPotentialDuplicate = true');
    } else {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('order.cancellationStatus IN (:...cancelStates)', {
            cancelStates: [CancellationStatus.REQUESTED, CancellationStatus.CONFIRMED],
          })
            .orWhere('order.status = :cancelledStatus', {
              cancelledStatus: OrderStatus.ANNULE,
            })
            .orWhere('order.isExchange = true')
            .orWhere('order.validationOutcome = :exchangedOutcome', {
              exchangedOutcome: ValidationOutcome.EXCHANGED,
            })
            .orWhere('order.isPotentialDuplicate = true')
            .orWhere("LOWER(COALESCE(order.tracking_status, '')) LIKE :failedSearch", {
              failedSearch: '%echou%',
            })
            .orWhere("LOWER(COALESCE(order.current_sub_status, '')) LIKE :failedSearch", {
              failedSearch: '%echou%',
            })
            .orWhere("LOWER(COALESCE(order.tracking_status, '')) LIKE :failedSearchAccent", {
              failedSearchAccent: '%échou%',
            })
            .orWhere("LOWER(COALESCE(order.current_sub_status, '')) LIKE :failedSearchAccent", {
              failedSearchAccent: '%échou%',
            });
        })
      );
    }

    const rawOrders = (await query.getMany()) as Order[];

    const orders = rawOrders.map((order) => {
      const isCancellation =
        order.cancellationStatus === CancellationStatus.REQUESTED ||
        order.cancellationStatus === CancellationStatus.CONFIRMED ||
        order.status === OrderStatus.ANNULE;
      const isExchange =
        order.isExchange || order.validationOutcome === ValidationOutcome.EXCHANGED;
      const isFailedDelivery = this.hasFailedDeliverySignal(order);
      const isDuplicate = !!order.isPotentialDuplicate;

      const reclamationTags: string[] = [];
      if (isCancellation) reclamationTags.push('cancellation');
      if (isExchange) reclamationTags.push('exchange');
      if (isFailedDelivery) reclamationTags.push('failed_delivery');
      if (isDuplicate) reclamationTags.push('duplicate');

      return {
        ...order,
        reclamationTags,
        reclamationPriority: reclamationTags.length,
      };
    });

    const summary = {
      total: orders.length,
      cancellation: orders.filter((order) => order.reclamationTags.includes('cancellation')).length,
      exchange: orders.filter((order) => order.reclamationTags.includes('exchange')).length,
      failedDelivery: orders.filter((order) => order.reclamationTags.includes('failed_delivery')).length,
      duplicate: orders.filter((order) => order.reclamationTags.includes('duplicate')).length,
    };

    return {
      orders,
      summary,
    };
  }

  async getCommandesStatistics(filters?: {
    tab?: 'statistics' | 'advance' | 'daily' | 'confirmed' | 'undefined' | 'on_alert';
    startDate?: string;
    endDate?: string;
    assignedToId?: number;
    status?: string;
    search?: string;
  }): Promise<any> {
    const tab = filters?.tab || 'statistics';

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.wilaya', 'wilaya')
      .leftJoinAndSelect('order.deliveryPlatform', 'deliveryPlatform')
      .leftJoinAndSelect('order.assignedTo', 'assignedTo')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product')
      .orderBy('order.createdAt', 'DESC');

    if (filters?.startDate) {
      query.andWhere('order.createdAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    if (filters?.assignedToId) {
      query.andWhere('order.assignedToId = :assignedToId', {
        assignedToId: filters.assignedToId,
      });
    }

    if (filters?.status) {
      query.andWhere('order.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('CAST(order.id AS TEXT) ILIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('order.customerName ILIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('order.phoneNumber ILIKE :search', {
              search: `%${filters.search}%`,
            });
        })
      );
    }

    const orders = (await query.getMany()) as Order[];

    const confirmedStatuses = [
      OrderStatus.CONFIRME,
      OrderStatus.OTP_CONFIRME,
      OrderStatus.VERS_LA_WILAYA,
      OrderStatus.RECU_A_LA_WILAYA,
      OrderStatus.LIVRE,
    ];
    const shippedStatuses = [OrderStatus.VERS_LA_WILAYA, OrderStatus.RECU_A_LA_WILAYA];

    const statusBuckets: Record<string, number> = {
      pending: 0,
      not_answered_1st_attempt: 0,
      confirmed: 0,
      confirmed_otp: 0,
      to_wilaya: 0,
      received_wilaya: 0,
      delivered: 0,
      cancelled: 0,
      fake_order: 0,
    };

    for (const order of orders) {
      if (order.status === OrderStatus.EN_ATTENTE) statusBuckets.pending += 1;
      else if (order.status === OrderStatus.NON_REPONDU_1ERE) statusBuckets.not_answered_1st_attempt += 1;
      else if (order.status === OrderStatus.CONFIRME) statusBuckets.confirmed += 1;
      else if (order.status === OrderStatus.OTP_CONFIRME) statusBuckets.confirmed_otp += 1;
      else if (order.status === OrderStatus.VERS_LA_WILAYA) statusBuckets.to_wilaya += 1;
      else if (order.status === OrderStatus.RECU_A_LA_WILAYA) statusBuckets.received_wilaya += 1;
      else if (order.status === OrderStatus.LIVRE) statusBuckets.delivered += 1;
      else if (order.status === OrderStatus.ANNULE) statusBuckets.cancelled += 1;
      else if (order.status === OrderStatus.COMMANDE_FICTIVE) statusBuckets.fake_order += 1;
    }

    const totalOrders = orders.length;
    const confirmedOrders = orders.filter((order) => confirmedStatuses.includes(order.status)).length;
    const nonConfirmedOrders = totalOrders - confirmedOrders;
    const shippedOrders = orders.filter((order) => shippedStatuses.includes(order.status)).length;
    const deliveredOrders = orders.filter((order) => order.status === OrderStatus.LIVRE).length;
    const returnedOrders = orders.filter((order) => order.validationOutcome === ValidationOutcome.RETURNED).length;
    const undefinedOrders = orders.filter((order) => this.hasUndefinedSignal(order));
    const onAlertOrders = orders.filter((order) => this.hasOnAlertSignal(order));

    const sumBy = (arr: Order[]) =>
      arr.reduce((total, order) => total + Number(order.totalPrice || 0), 0);

    const confirmedRevenue = sumBy(
      orders.filter((order) =>
        [OrderStatus.CONFIRME, OrderStatus.OTP_CONFIRME, OrderStatus.VERS_LA_WILAYA, OrderStatus.RECU_A_LA_WILAYA, OrderStatus.LIVRE].includes(order.status)
      )
    );
    const shippedRevenue = sumBy(orders.filter((order) => shippedStatuses.includes(order.status)));
    const deliveredRevenue = sumBy(orders.filter((order) => order.status === OrderStatus.LIVRE));
    const totalCosts = orders.reduce((total, order) => total + Number(order.shippingFee || 0), 0);
    const netProfit = deliveredRevenue - totalCosts;
    const margin = deliveredRevenue > 0 ? (netProfit / deliveredRevenue) * 100 : 0;

    if (tab === 'confirmed') {
      return {
        tab,
        summary: {
          totalOrders,
          confirmedOrders,
          nonConfirmedOrders,
          confirmationRate: totalOrders > 0 ? parseFloat(((confirmedOrders / totalOrders) * 100).toFixed(2)) : 0,
        },
        orders,
      };
    }

    if (tab === 'undefined') {
      return {
        tab,
        summary: {
          total: undefinedOrders.length,
          label: 'lost_parcels',
        },
        orders: undefinedOrders,
      };
    }

    if (tab === 'on_alert') {
      return {
        tab,
        summary: {
          total: onAlertOrders.length,
          label: 'delivery_alerts',
        },
        orders: onAlertOrders,
      };
    }

    if (tab === 'advance') {
      return {
        tab,
        deliveryRatePerOrder: {
          allOrdersPercent: totalOrders > 0 ? 100 : 0,
          deliveryPercent: totalOrders > 0 ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(2)) : 0,
        },
        summary: {
          totalOrders,
          deliveredOrders,
        },
      };
    }

    if (tab === 'daily') {
      return {
        tab,
        cards: {
          totalOrders,
          confirmedOrders,
          shippedOrders,
          deliveredOrders,
          returnedOrders,
          successRate: totalOrders > 0 ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(2)) : 0,
          returnRate: totalOrders > 0 ? parseFloat(((returnedOrders / totalOrders) * 100).toFixed(2)) : 0,
        },
        financial: {
          confirmedRevenue,
          shippedRevenue,
          deliveredRevenue,
          totalCosts,
          netProfit,
          margin: parseFloat(margin.toFixed(2)),
        },
        conversionFunnel: {
          totalOrders,
          confirmedOrders,
          shippedOrders,
          deliveredOrders,
          confirmedRate: totalOrders > 0 ? parseFloat(((confirmedOrders / totalOrders) * 100).toFixed(2)) : 0,
          shippedRateFromConfirmed: confirmedOrders > 0 ? parseFloat(((shippedOrders / confirmedOrders) * 100).toFixed(2)) : 0,
          deliveredRateFromShipped: shippedOrders > 0 ? parseFloat(((deliveredOrders / shippedOrders) * 100).toFixed(2)) : 0,
        },
      };
    }

    return {
      tab: 'statistics',
      statusDistribution: statusBuckets,
      summary: {
        totalOrders,
        confirmedOrders,
        nonConfirmedOrders,
        undefinedCount: undefinedOrders.length,
        onAlertCount: onAlertOrders.length,
      },
      orders,
    };
  }

  async getRetoursStatistics(filters?: {
    startDate?: string;
    endDate?: string;
    assignedToId?: number;
    platformId?: number;
    wilayaId?: number;
    search?: string;
  }): Promise<any> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.wilaya', 'wilaya')
      .leftJoinAndSelect('order.deliveryPlatform', 'deliveryPlatform')
      .leftJoinAndSelect('order.assignedTo', 'assignedTo')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product')
      .where('order.validationOutcome = :returnedOutcome', {
        returnedOutcome: ValidationOutcome.RETURNED,
      })
      .orderBy('order.updatedAt', 'DESC');

    if (filters?.startDate) {
      query.andWhere('order.updatedAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.andWhere('order.updatedAt <= :endDate', { endDate });
    }

    if (filters?.assignedToId) {
      query.andWhere('order.assignedToId = :assignedToId', {
        assignedToId: filters.assignedToId,
      });
    }

    if (filters?.platformId) {
      query.andWhere('order.deliveryPlatformId = :platformId', {
        platformId: filters.platformId,
      });
    }

    if (filters?.wilayaId) {
      query.andWhere('order.wilayaId = :wilayaId', {
        wilayaId: filters.wilayaId,
      });
    }

    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('CAST(order.id AS TEXT) ILIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('order.customerName ILIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('order.phoneNumber ILIKE :search', {
              search: `%${filters.search}%`,
            });
        })
      );
    }

    const returnedOrders = (await query.getMany()) as Order[];

    const deliveredCount = await this.orderRepository.count({
      where: { status: OrderStatus.LIVRE },
    });

    const totalReturnedOrders = returnedOrders.length;
    const returnedRevenue = returnedOrders.reduce(
      (total, order) => total + Number(order.totalPrice || 0),
      0
    );

    const averageReturnValue =
      totalReturnedOrders > 0 ? returnedRevenue / totalReturnedOrders : 0;

    const returnRateFromDelivered =
      deliveredCount > 0 ? (totalReturnedOrders / deliveredCount) * 100 : 0;

    const byWilayaMap = new Map<string, number>();
    const byPlatformMap = new Map<string, number>();

    for (const order of returnedOrders) {
      const wilayaName = order.wilaya?.name || 'Unknown';
      const platformName = order.deliveryPlatform?.name || 'Not assigned';

      byWilayaMap.set(wilayaName, (byWilayaMap.get(wilayaName) || 0) + 1);
      byPlatformMap.set(platformName, (byPlatformMap.get(platformName) || 0) + 1);
    }

    return {
      summary: {
        totalReturnedOrders,
        deliveredCount,
        returnRateFromDelivered: parseFloat(returnRateFromDelivered.toFixed(2)),
        returnedRevenue: parseFloat(returnedRevenue.toFixed(2)),
        averageReturnValue: parseFloat(averageReturnValue.toFixed(2)),
      },
      breakdown: {
        byWilaya: Array.from(byWilayaMap.entries()).map(([name, count]) => ({
          name,
          count,
        })),
        byPlatform: Array.from(byPlatformMap.entries()).map(([name, count]) => ({
          name,
          count,
        })),
      },
      orders: returnedOrders,
      count: returnedOrders.length,
    };
  }

  async getOrderHistory(orderId: number): Promise<OrderHistory[]> {
    return await this.orderHistoryRepository.find({
      where: { orderId },
      order: { timestamp: 'ASC' },
      relations: ['changedByUser'],
    });
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
    changedByUserId?: number,
    details?: string
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;

    const oldStatus = order.status;
    const statusPatch: Partial<Order> = { status };

    if (status === OrderStatus.LIVRE) {
      statusPatch.isValidated = true;
      statusPatch.validationOutcome = ValidationOutcome.RECEIVED;
      statusPatch.validatedAt = order.validatedAt || new Date();
    } else if (
      order.isValidated ||
      order.validationOutcome === ValidationOutcome.RECEIVED
    ) {
      statusPatch.isValidated = false;
      statusPatch.validationOutcome = null;
      statusPatch.validatedAt = null;
    }

    await this.orderRepository.update(id, statusPatch);

    await this.addOrderHistory(
      id,
      OrderAction.STATUS_UPDATED,
      status,
      changedByUserId,
      details || `Status changed from ${oldStatus} to ${status}`
    );

    return this.getOrderById(id);
  }

  async updateOrderDeliveryPlatform(
    id: number,
    platformId: number,
    changedByUserId?: number
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;

    const platform = await this.platformRepository.findOne({
      where: { id: platformId },
    });
    if (!platform) throw new Error('Delivery platform not found');

    await this.orderRepository.update(id, { deliveryPlatformId: platformId });

    await this.addOrderHistory(
      id,
      OrderAction.DELIVERY_ASSIGNED,
      order.status,
      changedByUserId,
      `Assigned to ${platform.name}`
    );

    return this.getOrderById(id);
  }

  async updateOrder(
    id: number,
    updateData: Partial<Order>,
    changedByUserId?: number,
    historyNote?: string
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;
    const previousStatus = order.status;

    // Track if any exchange-related fields changed
    const exchangeFieldsChanged =
      (updateData.isExchange !== undefined && updateData.isExchange !== order.isExchange) ||
      (updateData.exchangePrice !== undefined && updateData.exchangePrice !== order.exchangePrice) ||
      (updateData.productToCollect !== undefined && updateData.productToCollect !== order.productToCollect);

    const isExchangeRequest =
      updateData.isExchange === true ||
      updateData.validationOutcome === ValidationOutcome.EXCHANGED;

    if (isExchangeRequest) {
      this.assertExchangeEligibility(order);
    }

    const anyUpdateData = updateData as any;
    if (anyUpdateData.notes && !updateData.remark) {
      updateData.remark = anyUpdateData.notes;
    }

    // Enforce business meaning for validation.
    const hasValidationOutcome = updateData.validationOutcome !== undefined;

    if (hasValidationOutcome) {
      if (updateData.validationOutcome === ValidationOutcome.RECEIVED) {
        if (updateData.isValidated === false) {
          throw new Error('Validation outcome "received" requires isValidated=true');
        }

        updateData.isValidated = true;
        updateData.status = updateData.status || OrderStatus.LIVRE;
        if (updateData.validatedAt === undefined) {
          updateData.validatedAt = order.validatedAt || new Date();
        }
      } else {
        if (updateData.status === OrderStatus.LIVRE) {
          throw new Error('Status "Livré" requires validation outcome "received"');
        }

        updateData.isValidated = false;
        updateData.validatedAt = null;

        if (updateData.validationOutcome === ValidationOutcome.EXCHANGED) {
          updateData.isExchange = updateData.isExchange ?? true;
        }
      }
    } else {
      if (updateData.status === OrderStatus.LIVRE || updateData.isValidated === true) {
        updateData.isValidated = true;
        updateData.status = updateData.status || OrderStatus.LIVRE;
        updateData.validationOutcome = ValidationOutcome.RECEIVED;
        if (updateData.validatedAt === undefined) {
          updateData.validatedAt = order.validatedAt || new Date();
        }
      }

      if (updateData.isValidated === false) {
        if (updateData.status === OrderStatus.LIVRE) {
          throw new Error('Status "Livré" requires isValidated=true');
        }

        updateData.validationOutcome = null;
        updateData.validatedAt = null;
      }
    }

    // Recalculate total price if shipping fee changed
    if (updateData.shippingFee !== undefined && Number(updateData.shippingFee) !== Number(order.shippingFee)) {
      const oldShippingFee = Number(order.shippingFee);
      const newShippingFee = Number(updateData.shippingFee);
      order.totalPrice = Number(order.totalPrice) - oldShippingFee + newShippingFee;
    }

    // Apply updates
    Object.assign(order, updateData);
    await this.orderRepository.save(order);

    // If status changed, use STATUS_UPDATED action
    if (updateData.status && updateData.status !== previousStatus) {
      await this.addOrderHistory(
        id,
        OrderAction.STATUS_UPDATED,
        updateData.status,
        changedByUserId,
        historyNote || `Status updated to ${updateData.status}`
      );
    } else if (exchangeFieldsChanged) {
      // If exchange fields changed, use EXCHANGE action
      await this.addOrderHistory(
        id,
        OrderAction.EXCHANGE,
        order.status,
        changedByUserId,
        historyNote || (order.isExchange ? 'Order marked for exchange' : 'Exchange info updated')
      );
    } else if (historyNote) {
      // Default log if there's a note
      await this.addOrderHistory(
        id,
        OrderAction.STATUS_UPDATED,
        order.status,
        changedByUserId,
        historyNote
      );
    }

    return this.getOrderById(id);
  }

  async requestExchange(
    id: number,
    userId: number,
    reason?: string
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId && order.userId !== userId) {
      throw new Error('Unauthorized');
    }

    this.assertExchangeEligibility(order);

    const latestExchangeState = await this.getLatestExchangeState(id);
    if (latestExchangeState === 'requested') {
      throw new Error('Exchange request is already pending admin review');
    }

    await this.logOrderAction(
      id,
      OrderAction.EXCHANGE,
      userId,
      `[EXCHANGE_REQUEST] ${reason || 'No reason provided'}`
    );

    return this.getOrderById(id);
  }

  async approveExchange(
    id: number,
    adminUserId: number,
    note?: string
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    const latestExchangeState = await this.getLatestExchangeState(id);
    if (latestExchangeState !== 'requested') {
      throw new Error('No pending exchange request for this order');
    }

    const updatedOrder = await this.updateOrder(
      id,
      { isExchange: true },
      adminUserId,
      note || 'Exchange approved by admin'
    );

    await this.logOrderAction(
      id,
      OrderAction.EXCHANGE,
      adminUserId,
      `[EXCHANGE_APPROVED] ${note || 'Approved by admin'}`
    );

    return updatedOrder;
  }

  async rejectExchange(
    id: number,
    adminUserId: number,
    note?: string
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    const latestExchangeState = await this.getLatestExchangeState(id);
    if (latestExchangeState !== 'requested') {
      throw new Error('No pending exchange request for this order');
    }

    await this.logOrderAction(
      id,
      OrderAction.EXCHANGE,
      adminUserId,
      `[EXCHANGE_REJECTED] ${note || 'Rejected by admin'}`
    );

    return this.getOrderById(id);
  }

  async addOrderHistory(
    orderId: number,
    action: OrderAction,
    status?: OrderStatus,
    changedByUserId?: number,
    details?: string
  ): Promise<OrderHistory> {
    const history = this.orderHistoryRepository.create({
      orderId,
      action,
      status,
      changedByUserId,
      details,
    });
    return await this.orderHistoryRepository.save(history);
  }

  async cancelOrder(id: number, userId: number): Promise<Order | null> {
    const order = await this.getOrderById(id);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (
      order.status === OrderStatus.VERS_LA_WILAYA ||
      order.status === OrderStatus.LIVRE
    ) {
      throw new Error('Cannot cancel shipped or delivered orders');
    }

    // Restore stock
    for (const item of order.orderItems) {
      const product = await this.productService.getProductById(
        item.productId
      );
      if (product) {
        await this.productService.updateStock(
          product.id,
          product.stock + item.quantity
        );
      }
    }

    return this.updateOrderStatus(id, OrderStatus.ANNULE, userId, 'Order cancelled by user');
  }

  async requestCancellation(id: number, reason?: string, userId?: number): Promise<Order | null> {
    const order = await this.getOrderById(id);

    if (!order) {
      throw new Error('Order not found');
    }

    if (
      order.status === OrderStatus.VERS_LA_WILAYA ||
      order.status === OrderStatus.LIVRE
    ) {
      throw new Error('Cannot request cancellation for shipped or delivered orders');
    }

    order.cancellationStatus = CancellationStatus.REQUESTED;
    if (reason) {
      order.cancellationReason = reason;
    }

    const savedOrder = await this.orderRepository.save(order);

    if (userId) {
      await this.logOrderAction(id, OrderAction.STATUS_UPDATED, userId, `Cancellation requested: ${reason || 'No reason provided'}`);
    }

    return savedOrder;
  }

  async confirmCancellation(id: number, userId?: number): Promise<Order | null> {
    const order = await this.getOrderById(id);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.cancellationStatus !== CancellationStatus.REQUESTED) {
      throw new Error('Order is not in requested cancellation state');
    }

    // Restore stock
    for (const item of order.orderItems) {
      const product = await this.productService.getProductById(
        item.productId
      );
      if (product) {
        await this.productService.updateStock(
          product.id,
          product.stock + item.quantity
        );
      }
    }

    order.cancellationStatus = CancellationStatus.CONFIRMED;
    order.status = OrderStatus.ANNULE;

    const savedOrder = await this.orderRepository.save(order);

    if (userId) {
      await this.logOrderAction(id, OrderAction.CANCELLED, userId, 'Cancellation request confirmed');
    }

    return savedOrder;
  }

  async rejectCancellation(id: number, userId?: number): Promise<Order | null> {
    const order = await this.getOrderById(id);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.cancellationStatus !== CancellationStatus.REQUESTED) {
      throw new Error('Order is not in requested cancellation state');
    }

    order.cancellationStatus = CancellationStatus.NONE;
    order.cancellationReason = null as any;

    const savedOrder = await this.orderRepository.save(order);

    if (userId) {
      await this.logOrderAction(id, OrderAction.STATUS_UPDATED, userId, 'Cancellation request rejected');
    }

    return savedOrder;
  }

  async logOrderAction(
    id: number,
    action: OrderAction,
    changedByUserId?: number,
    details?: string
  ): Promise<OrderHistory> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    return await this.addOrderHistory(
      id,
      action,
      order.status,
      changedByUserId,
      details
    );
  }

  async getConfirmationStats(): Promise<{
    totalOrders: number;
    confirmedOrders: number;
    nonConfirmedOrders: number;
    confirmationRate: number;
  }> {
    const totalOrders = await this.orderRepository.count();
    const confirmedOrders = await this.orderRepository.count({
      where: [
        { status: OrderStatus.CONFIRME },
        { status: OrderStatus.OTP_CONFIRME },
        { status: OrderStatus.LIVRE },
        { status: OrderStatus.VERS_LA_WILAYA },
        { status: OrderStatus.RECU_A_LA_WILAYA },
      ],
    });

    const nonConfirmedOrders = totalOrders - confirmedOrders;
    const confirmationRate = totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      confirmedOrders,
      nonConfirmedOrders,
      confirmationRate: parseFloat(confirmationRate.toFixed(2)),
    };
  }

  async getWilayaTrackingOrders(): Promise<any[]> {
    const trackingStatuses = ['En Localisation', 'Reçu à Wilaya', 'Tentative Échouée'];
    const generalStatuses = [OrderStatus.RECU_A_LA_WILAYA];

    // Get orders that are currently in the customer's wilaya or in localization
    const orders = await this.orderRepository.find({
      where: [
        { tracking_status: In(trackingStatuses) },
        { current_sub_status: In(trackingStatuses) },
        { status: In(generalStatuses) }
      ],
      relations: ['customer', 'wilaya', 'deliveryPlatform', 'trackingLogs'],
      order: { last_status_change_at: 'ASC' } // Older entries first (higher priority to call)
    });

    const now = new Date();

    return orders.map((order: { last_status_change_at: any; updatedAt: any; createdAt: any; trackingLogs: { filter: (arg0: { (log: any): any; (log: any): any; }) => { (): any; new(): any; length: number; sort: { (arg0: (a: any, b: any) => number): any[]; new(): any; }; }; find: (arg0: (l: any) => any) => { (): any; new(): any; description: any; }; }; remark: any; }) => {
      const lastChange = order.last_status_change_at || order.updatedAt || order.createdAt;
      const hoursDiff = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60);

      let agingColor: 'green' | 'yellow' | 'orange' | 'red' = 'green';
      if (hoursDiff > 48) {
        agingColor = 'red';
      } else if (hoursDiff > 24) {
        agingColor = 'yellow';
      }

      // Attempts count logic: count logs mentioning "Tentative Échouée"
      const attemptsCount =
        order.trackingLogs?.filter(
          (log) =>
            (log.status && log.status.includes('Échouée')) ||
            (log.sub_status && log.sub_status.includes('Échouée')) ||
            (log.description && log.description.includes('Tentative'))
        ).length || 0;

      // Extract livreur remarks from logs
      // Assuming actor contains "Livreur" or description mentions it
      const livreurRemarks = order.trackingLogs
        ?.filter(
          (log) =>
            log.actor === 'Livreur' ||
            (log.description && log.description.toLowerCase().includes('livreur'))
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Newest first
        .map((log) => ({
          text: log.description,
          date: log.timestamp,
          location: log.location
        }));

      return {
        ...order,
        agingColor,
        agingHours: Math.floor(hoursDiff),
        attemptsCount,
        recentLivreurRemarks: livreurRemarks,
        lastFailureReason: order.trackingLogs?.find(l => l.sub_status?.includes('Échouée'))?.description || order.remark
      };
    });
  }

  async addTrackingLog(
    orderId: number,
    status: string,
    subStatus?: string,
    description?: string,
    location?: string,
    actor?: string
  ): Promise<TrackingLog> {
    const log = this.trackingLogRepository.create({
      orderId,
      status,
      sub_status: subStatus,
      description,
      location,
      actor,
    });

    // Update order's current tracking status cache
    await this.orderRepository.update(orderId, {
      tracking_status: status,
      current_sub_status: subStatus,
      last_status_change_at: new Date(),
    });

    const savedLog = await this.trackingLogRepository.save(log);
    return savedLog;
  }
}
