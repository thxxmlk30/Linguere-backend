import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { OrderStatus } from '../common/enums/order-status.enum';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Ingredient)
    private ingredientsRepository: Repository<Ingredient>,
    @InjectRepository(MenuItem)
    private menuRepository: Repository<MenuItem>,
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

    // "Aujourd'hui" au sens de la date de creation : il n'existe pas de
    // colonne cancelledAt, donc c'est le nombre de commandes creees
    // aujourd'hui et actuellement annulees (pas forcement annulees "aujourd'hui").
    const cancelledOrdersToday = await this.ordersRepository.count({
      where: {
        status: OrderStatus.CANCELLED,
        createdAt: MoreThanOrEqual(startOfDay),
      },
    });

    const avgRatingRaw = (await this.ordersRepository
      .createQueryBuilder('o')
      .select('AVG(o.rating)', 'averageRating')
      .where('o.rating IS NOT NULL')
      .getRawOne()) as { averageRating: string | null };

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
      cancelledOrdersToday,
      averageRating: avgRatingRaw.averageRating
        ? Number(Number(avgRatingRaw.averageRating).toFixed(2))
        : null,
    };
  }

  async topItems(limit = 5) {
    interface TopItemRow {
      menuItemId: string;
      name: string;
      totalQuantity: string;
      totalRevenue: string;
    }

    const rows: TopItemRow[] = await this.orderItemsRepository
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

    // Les agregats raw de TypeORM sont des chaines : on les convertit pour
    // que le frontend n'ait pas a re-parser des nombres lui-meme.
    return rows.map((row) => ({
      menuItemId: row.menuItemId,
      name: row.name,
      totalQuantity: Number(row.totalQuantity),
      totalRevenue: Number(row.totalRevenue),
    }));
  }

  async revenueTrend(days = 7) {
    const startDate = startOfDaysAgo(days);

    interface TrendRow {
      date: string;
      orders: string;
      revenue: string;
    }

    const rows: TrendRow[] = await this.ordersRepository
      .createQueryBuilder('o')
      .select("DATE_FORMAT(o.createdAt, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
      .where('o.createdAt >= :startDate', { startDate })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy("DATE_FORMAT(o.createdAt, '%Y-%m-%d')")
      .orderBy('date', 'ASC')
      .getRawMany();

    const byDate = new Map(rows.map((row) => [row.date, row]));
    const result: Array<{ date: string; orders: number; revenue: number }> = [];

    for (let i = 0; i < days; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      const key = toDateKey(day);
      const row = byDate.get(key);

      result.push({
        date: key,
        orders: row ? Number(row.orders) : 0,
        revenue: row ? Number(row.revenue) : 0,
      });
    }

    return result;
  }

  async cancellationStats(days = 30) {
    const startDate = startOfDaysAgo(days);

    const totalOrders = await this.ordersRepository.count({
      where: { createdAt: MoreThanOrEqual(startDate) },
    });
    const cancelledOrders = await this.ordersRepository.count({
      where: {
        createdAt: MoreThanOrEqual(startDate),
        status: OrderStatus.CANCELLED,
      },
    });

    return {
      totalOrders,
      cancelledOrders,
      cancellationRate:
        totalOrders > 0
          ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1))
          : 0,
    };
  }

  /**
   * Marge par plat, uniquement pour les plats dont TOUS les ingredients de
   * la recette ont un costPerUnit renseigne (sinon le cout est inconnu, on
   * exclut le plat plutot que d'afficher une marge fausse).
   */
  async profitability(limit = 10) {
    const menuItems = await this.menuRepository.find({
      relations: { recipe: { ingredient: true } },
    });

    const costByMenuItemId = new Map<string, number>();
    for (const item of menuItems) {
      if (!item.recipe || item.recipe.length === 0) {
        continue;
      }

      let cost = 0;
      let complete = true;
      for (const line of item.recipe) {
        const costPerUnit = line.ingredient?.costPerUnit;
        if (costPerUnit === null || costPerUnit === undefined) {
          complete = false;
          break;
        }
        cost += line.quantityRequired * Number(costPerUnit);
      }

      if (complete) {
        costByMenuItemId.set(item.id, cost);
      }
    }

    if (costByMenuItemId.size === 0) {
      return [];
    }

    interface SalesRow {
      menuItemId: string;
      name: string;
      quantitySold: string;
      revenue: string;
    }

    const salesRows: SalesRow[] = await this.orderItemsRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.menuItem', 'mi')
      .innerJoin('oi.order', 'o')
      .select('mi.id', 'menuItemId')
      .addSelect('mi.name', 'name')
      .addSelect('SUM(oi.quantity)', 'quantitySold')
      .addSelect('SUM(oi.quantity * oi.unitPrice)', 'revenue')
      .where('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('mi.id IN (:...ids)', { ids: [...costByMenuItemId.keys()] })
      .groupBy('mi.id')
      .addGroupBy('mi.name')
      .getRawMany();

    const results = salesRows.map((row) => {
      const quantitySold = Number(row.quantitySold);
      const revenue = Number(row.revenue);
      const costPerUnit = costByMenuItemId.get(row.menuItemId) ?? 0;
      const cost = Number((costPerUnit * quantitySold).toFixed(2));
      const margin = Number((revenue - cost).toFixed(2));
      const marginPercent =
        revenue > 0 ? Number(((margin / revenue) * 100).toFixed(1)) : 0;

      return {
        menuItemId: row.menuItemId,
        name: row.name,
        quantitySold,
        revenue,
        cost,
        margin,
        marginPercent,
      };
    });

    return results.sort((a, b) => b.margin - a.margin).slice(0, limit);
  }
}
