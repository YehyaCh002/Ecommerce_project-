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
import { Category } from './Category';
import { OrderItem } from './OrderItem';
import { CartItem } from './CartItem';
import { ProductVariant } from './ProductVariant';

@Entity('products')
@Index(['categoryId'])
@Index(['subCategoryId'])
@Index(['sku'])
@Index(['isActive'])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sku: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isLandingPageProduct: boolean;

  @Column({ type: 'boolean', default: true })
  deductStockOnConfirmation: boolean;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'int', nullable: true })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.subCategoryProducts, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'subCategoryId' })
  subCategory: Category;

  @Column({ type: 'int', nullable: true })
  subCategoryId: number;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.product)
  cartItems: CartItem[];

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
