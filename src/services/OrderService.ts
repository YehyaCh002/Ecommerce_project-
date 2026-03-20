import { AppDataSource } from '../config/data-source';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderHistory } from '../entities/OrderHistory';
import { Customer } from '../entities/Customer';
import { CartService } from './CartService';
import { ProductService } from './ProductService';

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private orderHistoryRepository = AppDataSource.getRepository(OrderHistory);
  private customerRepository = AppDataSource.getRepository(Customer);
  private cartService = new CartService();
  private productService = new ProductService();

  async createOrderFromCart(
    userId: string,
    shippingAddress: string,
    paymentMethod: string,
    notes?: string
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

    // Get user info for customer name and phone (you may need to adjust this)
    // For now, using placeholder values - you should fetch from user entity
    const order = this.orderRepository.create({
      userId,
      customerName: 'Customer', // TODO: Fetch from user entity
      phoneNumber: '0000000000', // TODO: Fetch from user entity
      totalPrice,
      shippingAddress,
      paymentMethod,
      notes,
      status: OrderStatus.EN_ATTENTE,
      source: 'Website' as any,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Initial history entry
    await this.addOrderHistory(
      savedOrder.id,
      'Order Created',
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
    items: { productId: string; quantity: number }[],
    paymentMethod: string,
    notes?: string
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
    const validatedItems = [];

    for (const item of items) {
      const product = await this.productService.getProductById(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }
      totalPrice += Number(product.price) * item.quantity;
      validatedItems.push({ product, quantity: item.quantity });
    }

    // 3. Create Order
    const order = this.orderRepository.create({
      customerId: customer.id,
      customerName: customer.name,
      phoneNumber: customer.phoneNumber,
      totalPrice,
      shippingAddress: customerInfo.address,
      paymentMethod,
      notes,
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
      'Order Created (Guest Check-out)',
      OrderStatus.EN_ATTENTE,
      undefined,
      'Order was placed from landing page.'
    );

    // 6. Create order items and decrease stock
    for (const item of validatedItems) {
      const orderItem = this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      });

      await this.orderItemRepository.save(orderItem);
      await this.productService.decreaseStock(item.product.id, item.quantity);
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
      'Status Update',
      status,
      changedByUserId,
      details || `Status changed from ${oldStatus} to ${status}`
    );

    return this.getOrderById(id);
  }

  async addOrderHistory(
    orderId: number,
    action: string,
    status?: OrderStatus | string,
    changedByUserId?: string,
    details?: string
  ): Promise<OrderHistory> {
    const history = this.orderHistoryRepository.create({
      orderId,
      action,
      status: status?.toString(),
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
    action: string,
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
}
