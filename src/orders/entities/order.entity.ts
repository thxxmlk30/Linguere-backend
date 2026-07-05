import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'enum', enum: ['dine_in', 'delivery'], default: 'dine_in' })
  serviceType: 'dine_in' | 'delivery';

  @Column({ type: 'int', nullable: true })
  tableNumber: number | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryZoneId: string | null;

  @Column({ type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ type: 'text', nullable: true })
  deliveryNotes: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotalAmount: number;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerPhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  assignedChefId: string | null;

  @Column({ type: 'varchar', nullable: true })
  assignedChefName: string | null;

  @Column({ type: 'varchar', nullable: true })
  courierId: string | null;

  @Column({ type: 'varchar', nullable: true })
  courierName: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: ['unpaid', 'pending', 'paid', 'failed'], default: 'unpaid' })
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed';

  @Column({ type: 'varchar', nullable: true })
  paymentProvider: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentSessionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentIntentId: string | null;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true })
  review: string | null;

  @Column({ type: 'datetime', nullable: true })
  ratedAt: Date | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
