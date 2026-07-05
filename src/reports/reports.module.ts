import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Ingredient])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
