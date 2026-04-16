import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './Product';

@Entity('stock_movements')
@Index(['productId'])
@Index(['type'])
@Index(['createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  type: string;

  @Column({ type: 'int', default: 0 })
  totalChanges: number;

  @Column({ type: 'int' })
  oldStock: number;

  @Column({ type: 'int' })
  newStock: number;

  @Column({ type: 'jsonb', nullable: true })
  details: any;

  @CreateDateColumn()
  createdAt: Date;
}
