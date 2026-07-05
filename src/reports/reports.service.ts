import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { OrderStatus } from '../common/enums/order-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Ingredient)
    private ingredientsRepository: Repository<Ingredient>,
  ) {}

  async dashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    interface TodayStatsRaw {
      todayOrders?: string;
      todayRevenue?: string;
      deliveryOrders?: string;
      dineInOrders?: string;
    }

    const todayStats = (await this.ordersRepository
      .createQueryBuilder('o')
      .select('COUNT(*)', 'todayOrders')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'todayRevenue')
      .addSelect("SUM(o.serviceType = 'delivery')", 'deliveryOrders')
      .addSelect("SUM(o.serviceType = 'dine_in')", 'dineInOrders')
      .where('o.createdAt >= :startOfDay', { startOfDay })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne()) as TodayStatsRaw;

    const pendingOrders = await this.ordersRepository.count({
      where: { status: OrderStatus.PENDING },
    });

    const ingredientsLow = await this.ingredientsRepository
      .createQueryBuilder('i')
      .where('i.currentStock <= i.reorderThreshold')
      .getCount();

    return {
      todayOrders: Number(todayStats.todayOrders),
      todayRevenue: Number(todayStats.todayRevenue),
      deliveryOrders: Number(todayStats.deliveryOrders ?? 0),
      dineInOrders: Number(todayStats.dineInOrders ?? 0),
      pendingOrders,
      ingredientsLow,
    };
  }

  async topItems(limit = 5) {
    return this.orderItemsRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.menuItem', 'mi')
      .innerJoin('oi.order', 'o')
      .select('mi.id', 'menuItemId')
      .addSelect('mi.name', 'name')
      .addSelect('SUM(oi.quantity)', 'totalQuantity')
      .addSelect('SUM(oi.quantity * oi.unitPrice)', 'totalRevenue')
      .where('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy('mi.id')
      .addGroupBy('mi.name')
      .orderBy('totalQuantity', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
