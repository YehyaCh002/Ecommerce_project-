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

export enum OrderAction {
  CREATED = 'Créé',
  STATUS_UPDATED = 'Statut Mis à Jour',
  PRINTED = 'Imprimé',
  PREPARATION = 'En Préparation',
  EXPEDITION = 'Expédié',
  VERS_WILAYA = 'Vers Wilaya',
  RECU_WILAYA = 'Reçu à Wilaya',
  MESSAGE_SENT = 'Message Envoyé',
  TRANSFER = 'Transfert',
  CANCELLED = 'Annulé',
  DELIVERY_ASSIGNED = 'Livraison Assignée',
}

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
    type: 'enum',
    enum: OrderAction,
    default: OrderAction.CREATED,
  })
  action: OrderAction;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    nullable: true,
  })
  status: OrderStatus;

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
