import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from './Order';
import { Cart } from './Cart';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 50, default: 'customer' })
  role: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @OneToMany(() => Order, (order) => order.assignedTo)
  assignedOrders: Order[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
