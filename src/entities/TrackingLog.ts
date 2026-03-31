import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './Order';

@Entity('tracking_logs')
@Index(['orderId'])
@Index(['timestamp'])
export class TrackingLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.trackingLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'varchar', length: 100 })
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sub_status: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actor: string; // The person who performed the action (e.g. "Livreur", "System")

  @CreateDateColumn()
  timestamp: Date;
}
