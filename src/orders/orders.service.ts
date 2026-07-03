import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';

interface AuthUser {
  id: string;
  role: Role;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(MenuItem) private menuRepository: Repository<MenuItem>,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const items: OrderItem[] = [];
    let totalAmount = 0;

    for (const line of dto.items) {
      const menuItem = await this.menuRepository.findOne({
        where: { id: line.menuItemId },
      });

      if (!menuItem) {
        throw new NotFoundException(
          `Plat introuvable (id: ${line.menuItemId})`,
        );
      }

      const orderItem = new OrderItem();
      orderItem.menuItemId = menuItem.id;
      orderItem.quantity = line.quantity;
      orderItem.unitPrice = menuItem.price;
      items.push(orderItem);

      totalAmount += Number(menuItem.price) * line.quantity;
    }

    const order = this.ordersRepository.create({
      userId,
      items,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    return this.ordersRepository.save(order);
  }

  async findAllForUser(user: AuthUser): Promise<Order[]> {
    // Un admin voit toutes les commandes, un client ne voit que les siennes
    if (user.role === Role.ADMIN) {
      return this.ordersRepository.find({ order: { createdAt: 'DESC' } });
    }
    return this.ordersRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthUser): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException("Vous n'avez pas accès à cette commande");
    }

    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }
    order.status = status;
    return this.ordersRepository.save(order);
  }
}
