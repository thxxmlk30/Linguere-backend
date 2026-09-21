import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffRole } from '../../common/enums/staff-role.enum';
import { StaffStatus } from '../../common/enums/staff-status.enum';

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
    enum: StaffRole,
    default: StaffRole.WAITER,
  })
  role: StaffRole;

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

  @Column({ type: 'enum', enum: StaffStatus, default: StaffStatus.ACTIVE })
  status: StaffStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
