import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
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
  EXCHANGE = 'Échange',
}

@Entity('order_history')
@Index(['orderId'])
@Index(['timestamp'])
@Index(['changedByUserId'])
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
    enum: [
      'En attente',
      'Non répondu - 1ère tentative',
      'Confirmé',
      'OTP Confirmé',
      'Vers la Wilaya',
      'Reçu à la Wilaya',
      'Livré',
      'Annulé',
      'Commande Fictive'
    ],
    nullable: true,
  })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  details: string; // Detailed message or context

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser: User;

  @Column({ type: 'int', nullable: true })
  changedByUserId: number;

  @CreateDateColumn()
  timestamp: Date;
}
