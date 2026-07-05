import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('delivery_zones')
export class DeliveryZone {
  @PrimaryColumn()
  id: string;

  @Column()
  department: string;

  @Column()
  commune: string;

  @Column()
  sector: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'int', default: 0 })
  etaMinutes: number;

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lng: number;

  @Column({ type: 'float' })
  mapX: number;

  @Column({ type: 'float' })
  mapY: number;

  @Column({ type: 'simple-array' })
  landmarks: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
