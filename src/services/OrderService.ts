import { AppDataSource } from '../config/data-source';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { CartService } from './CartService';
import { ProductService } from './ProductService';

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private cartService = new CartService();
  private productService = new ProductService();

  async createOrderFromCart(
    userId: string,
    shippingAddress: string,
    paymentMethod: string,
    notes?: string
  ): Promise<Order> {
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

    return await this.getOrderById(savedOrder.id) as Order;
  }

  async getOrderById(id: number): Promise<Order | null> {
    return await this.orderRepository.findOne({
      where: { id },
      relations: ['orderItems', 'orderItems.product', 'user', 'wilaya', 'assignedTo', 'history'],
    });
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['orderItems', 'orderItems.product', 'wilaya', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllOrders(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['orderItems', 'orderItems.product', 'user', 'wilaya', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus
  ): Promise<Order | null> {
    await this.orderRepository.update(id, { status });
    return this.getOrderById(id);
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

    return this.updateOrderStatus(id, OrderStatus.ANNULE);
  }
}
