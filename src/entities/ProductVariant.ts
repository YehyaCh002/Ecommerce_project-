import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Product } from './Product';
import { OrderItem } from './OrderItem';
import { CartItem } from './CartItem';

@Entity('product_variants')
@Index(['productId'])
@Index(['sku'])
@Index(['productId', 'size', 'color'])
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: string; // e.g., 'S', 'M', 'L', 'XL'

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string; // e.g., 'Vert', 'Rouge'

  @Column({ type: 'int', default: 0 })
  stock: number; // Specific stock for this size/color

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOverride: number; // For variant-specific pricing

  @Column({ type: 'varchar', length: 255, nullable: true })
  sku: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.productVariant)
  orderItems: OrderItem[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.productVariant)
  cartItems: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
