import { AppDataSource } from '../config/data-source';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Product } from '../entities/Product';

export class CartService {
  private cartRepository = AppDataSource.getRepository(Cart);
  private cartItemRepository = AppDataSource.getRepository(CartItem);
  private productRepository = AppDataSource.getRepository(Product);

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId, isActive: true },
      relations: ['cartItems', 'cartItems.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  async getCartByUserId(userId: string): Promise<Cart | null> {
    return await this.cartRepository.findOne({
      where: { userId, isActive: true },
      relations: ['cartItems', 'cartItems.product', 'cartItems.product.category'],
    });
  }

  async addItemToCart(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    const cart = await this.getOrCreateCart(userId);

    const existingCartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      await this.cartItemRepository.save(existingCartItem);
    } else {
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return await this.getCartByUserId(userId) as Cart;
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.getCartByUserId(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, cartId: cart.id },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    if (cartItem.product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    cartItem.quantity = quantity;
    await this.cartItemRepository.save(cartItem);

    return await this.getCartByUserId(userId) as Cart;
  }

  async removeItemFromCart(
    userId: string,
    cartItemId: string
  ): Promise<Cart> {
    const cart = await this.getCartByUserId(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    await this.cartItemRepository.delete({
      id: cartItemId,
      cartId: cart.id,
    });

    return await this.getCartByUserId(userId) as Cart;
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getCartByUserId(userId);
    if (cart) {
      await this.cartItemRepository.delete({ cartId: cart.id });
    }
  }

  async getCartTotal(userId: string): Promise<number> {
    const cart = await this.getCartByUserId(userId);
    if (!cart || !cart.cartItems) return 0;

    return cart.cartItems.reduce((total, item) => {
      return total + Number(item.product.price) * item.quantity;
    }, 0);
  }
}
