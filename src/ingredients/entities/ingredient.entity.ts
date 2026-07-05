import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ingredients')
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'float', default: 0 })
  currentStock: number;

  @Column({ type: 'enum', enum: ['kg', 'l', 'unit', 'g'], default: 'unit' })
  unit: 'kg' | 'l' | 'unit' | 'g';

  @Column({ type: 'float', default: 0 })
  minStock: number;

  @Column({ type: 'float', default: 0 })
  reorderThreshold: number;

  @Column({ type: 'float', default: 0 })
  criticalStock: number;

  @Column({ type: 'varchar', nullable: true })
  supplier: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerUnit: number | null;

  @Column({ type: 'datetime', nullable: true })
  lastRestockedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastCountedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
