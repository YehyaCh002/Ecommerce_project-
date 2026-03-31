import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  AfterLoad,
  Index,
} from 'typeorm';
import { User } from './User';
import { Customer } from './Customer';
import { OrderItem } from './OrderItem';
import { Wilaya } from './Wilaya';
import { OrderHistory } from './OrderHistory';
import { DeliveryPlatform } from './DeliveryPlatform';
import { TrackingLog } from './TrackingLog';

export enum OrderStatus {
  EN_ATTENTE = 'En attente',
  NON_REPONDU_1ERE = 'Non répondu - 1ère tentative',
  CONFIRME = 'Confirmé',
  OTP_CONFIRME = 'OTP Confirmé',
  VERS_LA_WILAYA = 'Vers la Wilaya',
  RECU_A_LA_WILAYA = 'Reçu à la Wilaya',
  LIVRE = 'Livré',
  ANNULE = 'Annulé',
  COMMANDE_FICTIVE = 'Commande Fictive',
}

export enum OrderSource {
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  TIKTOK = 'TikTok',
  WEBSITE = 'Website',
  PHONE = 'Phone',
  OTHER = 'Other',
}

export enum ValidationOutcome {
  RECEIVED = 'received',
  RETURNED = 'returned',
  EXCHANGED = 'exchanged',
  REFUSED = 'refused',
  UNREACHABLE = 'unreachable',
  OTHER = 'other',
}

export enum CancellationStatus {
  NONE = 'none',
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
}

export enum DeliveryType {
  DOMICILE = 'Domicile',
  BUREAU = 'Bureau',
  YALIDINE_DESK = 'Yalidine Desk',
  STOP_DESK = 'Stop Desk',
}

@Entity('orders')
@Index(['status'])
@Index(['createdAt'])
@Index(['customerId'])
@Index(['assignedToId'])
@Index(['phoneNumber'])
@Index(['wilayaId'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.DOMICILE,
    nullable: true,
  })
  deliveryType: DeliveryType;

  @Column({ type: 'boolean', default: false })
  soldFromStore: boolean;

  @Column({ type: 'boolean', default: false })
  isValidated: boolean;

  @Column({ type: 'boolean', default: false })
  isPotentialDuplicate: boolean;

  @Column({
    type: 'enum',
    enum: ValidationOutcome,
    nullable: true,
  })
  validationOutcome: ValidationOutcome | null;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  // Customer Information
  @Column({ type: 'varchar', length: 255 })
  customerName: string;

  @Column({ type: 'varchar', length: 50 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail: string;

  @Column({ type: 'text', nullable: true })
  detailedAddress: string;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  // Status Management
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.EN_ATTENTE,
  })
  status: OrderStatus;

  // Cancellation Status
  @Column({
    type: 'enum',
    enum: CancellationStatus,
    default: CancellationStatus.NONE,
  })
  cancellationStatus: CancellationStatus;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  // Rating (1-5 stars)
  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({
    type: 'enum',
    enum: OrderSource,
    default: OrderSource.OTHER,
  })
  source: OrderSource;

  // Tracking & Failure Management
  @Column({ type: 'varchar', length: 100, nullable: true })
  tracking_status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  current_sub_status: string;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  last_status_change_at: Date | null;

  // Tracking Number
  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber: string;

  // Delay Status
  @Column({ type: 'boolean', default: false })
  isDelayed: boolean;

  // Relations to Wilaya
  @ManyToOne(() => Wilaya, (wilaya) => wilaya.orders, { nullable: true })
  @JoinColumn({ name: 'wilayaId' })
  wilaya: Wilaya;

  @Column({ type: 'int', nullable: true })
  wilayaId: number;

  // Assigned User (Associé)
  @ManyToOne(() => User, (user) => user.assignedOrders, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ type: 'int', nullable: true })
  assignedToId: number;

  // Customer Link
  @ManyToOne(() => Customer, (customer) => customer.orders, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'int', nullable: true })
  customerId: number;

  // For backward compatibility (Optional, can be removed once refactored)
  @Column({ type: 'int', nullable: true })
  userId: number;

  // Additional Fields
  @Column({ type: 'varchar', length: 500, nullable: true })
  shippingAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentMethod: string;


  // Delivery Platform link
  @ManyToOne(() => DeliveryPlatform, (platform) => platform.orders, {
    nullable: true,
  })
  @JoinColumn({ name: 'deliveryPlatformId' })
  deliveryPlatform: DeliveryPlatform;

  @Column({ type: 'int', nullable: true })
  deliveryPlatformId: number;

  @Column({ type: 'boolean', default: false })
  isExchange: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  exchangePrice: number;

  @Column({ type: 'text', nullable: true })
  productToCollect: string;

  @Column({ type: 'boolean', default: false })
  isFreeShipping: boolean;

  @Column({ type: 'boolean', default: false })
  hasInsurance: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFee: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'text', nullable: true })
  internalComment: string;

  // Timers (calculated for the frontend)
  elapsedMinutes: number;
  counterColor: 'green' | 'red';

  @AfterLoad()
  calculateTimers() {
    const diff = new Date().getTime() - this.createdAt.getTime();
    this.elapsedMinutes = Math.floor(diff / 60000);
    this.counterColor = this.elapsedMinutes <= 2 ? 'green' : 'red';
  }

  // Relations
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
  })
  orderItems: OrderItem[];

  @OneToMany(() => OrderHistory, (history) => history.order, {
    cascade: true,
  })
  history: OrderHistory[];

  @OneToMany(() => TrackingLog, (log) => log.order, {
    cascade: true,
  })
  trackingLogs: TrackingLog[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
