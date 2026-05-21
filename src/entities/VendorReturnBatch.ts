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
import { DeliveryPlatform } from './DeliveryPlatform';
import { User } from './User';
import { VendorReturnScan } from './VendorReturnScan';

export enum VendorReturnBatchStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('vendor_return_batches')
@Index(['createdAt'])
@Index(['status'])
export class VendorReturnBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DeliveryPlatform, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deliveryPlatformId' })
  deliveryPlatform: DeliveryPlatform;

  @Column({ type: 'int', nullable: true })
  deliveryPlatformId: number;

  @Column({ type: 'varchar', length: 255 })
  dischargeReference: string;

  @Column({ type: 'int', default: 0 })
  expectedCount: number;

  @Column({ type: 'jsonb', nullable: true })
  expectedTrackingNumbers: string[];

  @Column({
    type: 'enum',
    enum: VendorReturnBatchStatus,
    default: VendorReturnBatchStatus.OPEN,
  })
  status: VendorReturnBatchStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closedByUserId' })
  closedByUser: User;

  @Column({ type: 'uuid', nullable: true })
  closedByUserId: string | null;

  @OneToMany(() => VendorReturnScan, (scan) => scan.batch, { cascade: true })
  scans: VendorReturnScan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
