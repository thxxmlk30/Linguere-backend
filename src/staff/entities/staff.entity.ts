import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'waiter', 'chef', 'delivery'],
    default: 'waiter',
  })
  role: 'admin' | 'waiter' | 'chef' | 'delivery';

  @Column()
  phone: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  salary: number | null;

  @Column({ type: 'date', nullable: true })
  hireDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  shift: string | null;

  @Column({ type: 'varchar', nullable: true })
  zone: string | null;

  @Column({ type: 'enum', enum: ['active', 'break', 'off'], default: 'active' })
  status: 'active' | 'break' | 'off';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
