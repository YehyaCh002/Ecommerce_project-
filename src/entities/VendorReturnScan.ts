import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VendorReturnBatch } from './VendorReturnBatch';
import { Order } from './Order';
import { User } from './User';

@Entity('vendor_return_scans')
@Index(['batchId'])
@Index(['trackingNumber'])
@Index(['batchId', 'trackingNumber'], { unique: true })
export class VendorReturnScan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VendorReturnBatch, (batch) => batch.scans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batchId' })
  batch: VendorReturnBatch;

  @Column({ type: 'int' })
  batchId: number;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int', nullable: true })
  orderId: number;

  @Column({ type: 'varchar', length: 100 })
  trackingNumber: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'scannedByUserId' })
  scannedByUser: User;

  @Column({ type: 'int', nullable: true })
  scannedByUserId: number;

  @CreateDateColumn()
  scannedAt: Date;
}
