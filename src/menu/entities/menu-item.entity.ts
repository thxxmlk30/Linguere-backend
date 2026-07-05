import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MealCategory } from '../../common/enums/meal-category.enum';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: MealCategory })
  category: MealCategory;

  @Column({ default: true })
  available: boolean;

  @Column({ nullable: true })
  image: string | null;

  @Column({ default: 'any' })
  meal: string;

  @Column({ type: 'int', nullable: true })
  prepTimeMinutes: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
