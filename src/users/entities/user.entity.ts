import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  fullName: string;

  // Nullable : un compte créé via Google OAuth n'a pas de mot de passe local
  @Column({ nullable: true })
  @Exclude()
  password: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  role: Role;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  // Identifiant renvoyé par le provider OAuth (ex: Google "sub")
  @Column({ nullable: true })
  @Exclude()
  providerId: string | null;

  @Column({ default: false })
  isEmailVerified: boolean;

  // Code à 6 chiffres pour la vérification d'identité par email
  @Column({ nullable: true })
  @Exclude()
  otpCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  otpExpiresAt: Date | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;
}
