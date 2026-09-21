import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffRole } from '../../common/enums/staff-role.enum';
import { StaffStatus } from '../../common/enums/staff-status.enum';
import { User } from '../../users/entities/user.entity';

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

  // Compte de connexion optionnel : une fiche Staff (RH) n'a pas forcement
  // d'acces au dashboard tant que l'admin ne l'a pas "provisionnee"
  // (POST /staff/:id/provision-account).
  @Column({ type: 'varchar', nullable: true, unique: true })
  userId: string | null;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;
}
