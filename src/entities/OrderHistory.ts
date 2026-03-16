import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order, OrderStatus } from './Order';
import { User } from './User';

@Entity('order_history')
export class OrderHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int' })
  orderId: number;

  @Column({
    type: 'varchar',
    length: 100,
  })
  action: string; // e.g., 'Status Update', 'Order Printed', 'Message Sent'

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  status: string; // The status related to this history entry (if any)

  @Column({ type: 'text', nullable: true })
  details: string; // Detailed message or context

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser: User;

  @Column({ type: 'uuid', nullable: true })
  changedByUserId: string;

  @CreateDateColumn()
  timestamp: Date;
}
