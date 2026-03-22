import { AppDataSource } from '../config/data-source';
import { Order, OrderStatus, DeliveryType } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderHistory, OrderAction } from '../entities/OrderHistory';
import { Customer } from '../entities/Customer';
import { DeliveryPlatform } from '../entities/DeliveryPlatform';
import { CartService } from './CartService';
import { ProductService } from './ProductService';

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private orderHistoryRepository = AppDataSource.getRepository(OrderHistory);
  private customerRepository = AppDataSource.getRepository(Customer);
  private platformRepository = AppDataSource.getRepository(DeliveryPlatform);
  private cartService = new CartService();
  private productService = new ProductService();

  async createOrderFromCart(
    userId: string,
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
    const totalPrice = cart.cartItems.reduce((total, item) => {
      return total + Number(item.product.price) * item.quantity;
    }, 0);

    // Final total including shipping fee
    const finalTotalPrice = totalPrice + Number(shippingFee);

    // Get user info for customer name and phone (you may need to adjust this)
    // For now, using placeholder values - you should fetch from user entity
    const order = this.orderRepository.create({
      userId,
      customerName: 'Customer', // TODO: Fetch from user entity
      phoneNumber: '0000000000', // TODO: Fetch from user entity
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
      source: 'Website' as any,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Initial history entry
    await this.addOrderHistory(
      savedOrder.id,
      OrderAction.CREATED,
      OrderStatus.EN_ATTENTE,
      userId,
      'Order was placed successfully.'
    );

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
    items: { productId: string; quantity: number; variantId?: string }[],
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
        variant = product.variants?.find((v) => v.id === item.variantId);
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
      'Order was placed from landing page.'
    );

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

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['orderItems', 'orderItems.product', 'customer', 'wilaya', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllOrders(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['orderItems', 'orderItems.product', 'customer', 'wilaya', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
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
    changedByUserId?: string,
    details?: string
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;

    const oldStatus = order.status;
    await this.orderRepository.update(id, { status });

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
    platformId: string,
    changedByUserId?: string
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
    changedByUserId?: string,
    historyNote?: string
  ): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;

    // Track if any exchange-related fields changed
    const exchangeFieldsChanged =
      (updateData.isExchange !== undefined && updateData.isExchange !== order.isExchange) ||
      (updateData.exchangePrice !== undefined && updateData.exchangePrice !== order.exchangePrice) ||
      (updateData.productToCollect !== undefined && updateData.productToCollect !== order.productToCollect);

    const anyUpdateData = updateData as any;
    if (anyUpdateData.notes && !updateData.remark) {
      updateData.remark = anyUpdateData.notes;
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
    if (updateData.status && updateData.status !== order.status) {
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

  async addOrderHistory(
    orderId: number,
    action: OrderAction,
    status?: OrderStatus,
    changedByUserId?: string,
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

  async cancelOrder(id: number, userId: string): Promise<Order | null> {
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

  async logOrderAction(
    id: number,
    action: OrderAction,
    changedByUserId?: string,
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
}
