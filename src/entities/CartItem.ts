import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Cart } from './Cart';
import { Product } from './Product';
import { ProductVariant } from './ProductVariant';

@Entity('cart_items')
@Index(['cartId'])
@Index(['productId'])
@Index(['variantId'])
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cart, (cart) => cart.cartItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @Column({ type: 'int' })
  cartId: number;

  @ManyToOne(() => Product, (product) => product.cartItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @ManyToOne(() => ProductVariant, (variant) => variant.cartItems, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variantId' })
  productVariant: ProductVariant;

  @Column({ type: 'int', nullable: true })
  variantId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
