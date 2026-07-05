import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { AssignOrderStaffDto } from './dto/assign-order-staff.dto';
import { RateOrderDto } from './dto/rate-order.dto';

interface AuthUser {
  id: string;
  role: Role;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(MenuItem) private menuRepository: Repository<MenuItem>,
    @InjectRepository(DeliveryZone)
    private zonesRepository: Repository<DeliveryZone>,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const items: OrderItem[] = [];
    let subtotalAmount = 0;

    for (const line of dto.items) {
      const menuItem = await this.menuRepository.findOne({
        where: { id: line.menuItemId },
      });

      if (!menuItem) {
        throw new NotFoundException(
          `Plat introuvable (id: ${line.menuItemId})`,
        );
      }

      if (!menuItem.available) {
        throw new BadRequestException(
          `"${menuItem.name}" n'est plus disponible`,
        );
      }

      const orderItem = new OrderItem();
      orderItem.menuItemId = menuItem.id;
      orderItem.menuItem = menuItem;
      orderItem.quantity = line.quantity;
      orderItem.unitPrice = menuItem.price;
      items.push(orderItem);

      subtotalAmount += Number(menuItem.price) * line.quantity;
    }

    let deliveryFee = 0;
    if (dto.serviceType === 'delivery') {
      const zone = await this.zonesRepository.findOne({
        where: { id: dto.deliveryZoneId },
      });

      if (!zone) {
        throw new NotFoundException('Zone de livraison introuvable');
      }

      deliveryFee = Number(zone.fee);
    }

    const order = this.ordersRepository.create({
      userId,
      items,
      serviceType: dto.serviceType,
      tableNumber: dto.tableNumber ?? null,
      deliveryZoneId: dto.deliveryZoneId ?? null,
      deliveryAddress: dto.deliveryAddress ?? null,
      deliveryNotes: dto.deliveryNotes ?? null,
      customerName: dto.customerName ?? null,
      customerPhone: dto.customerPhone ?? null,
      assignedChefId: null,
      assignedChefName: null,
      courierId: null,
      courierName: null,
      paymentStatus: 'unpaid',
      paymentProvider: null,
      paymentSessionId: null,
      paymentIntentId: null,
      paidAt: null,
      deliveryFee,
      subtotalAmount,
      totalAmount: subtotalAmount + deliveryFee,
      status: OrderStatus.PENDING,
    });

    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  async findAllForUser(user: AuthUser) {
    if (user.role === Role.ADMIN) {
      const orders = await this.ordersRepository.find({
        order: { createdAt: 'DESC' },
      });
      return orders.map((order) => this.toResponse(order));
    }

    const orders = await this.ordersRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.toResponse(order));
  }

  async findMine(userId: string) {
    const orders = await this.ordersRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => this.toResponse(order));
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException("Vous n'avez pas accès à cette commande");
    }

    return this.toResponse(order);
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    order.status = status;
    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  async cancel(id: string, user: AuthUser) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException("Vous n'avez pas accès à cette commande");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Seules les commandes en attente peuvent être annulées',
      );
    }

    order.status = OrderStatus.CANCELLED;
    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  async assignChef(id: string, dto: AssignOrderStaffDto) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    order.assignedChefId = dto.staffId ?? null;
    order.assignedChefName = dto.staffName ?? null;
    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  async assignCourier(id: string, dto: AssignOrderStaffDto) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    order.courierId = dto.staffId ?? null;
    order.courierName = dto.staffName ?? null;
    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  async rate(id: string, user: AuthUser, dto: RateOrderDto) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException("Vous n'avez pas accès à cette commande");
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'La commande doit etre livree avant d etre notee',
      );
    }

    order.rating = dto.rating ?? null;
    order.review = dto.review?.trim() || null;
    order.ratedAt = dto.rating ? new Date() : null;
    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  async remove(id: string) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    await this.ordersRepository.remove(order);
  }

  private toResponse(order: Order) {
    return {
      id: order.id,
      serviceType: order.serviceType,
      tableNumber: order.tableNumber ?? undefined,
      deliveryZoneId: order.deliveryZoneId ?? undefined,
      deliveryAddress: order.deliveryAddress ?? undefined,
      deliveryNotes: order.deliveryNotes ?? undefined,
      deliveryFee: Number(order.deliveryFee ?? 0),
      customerName: order.customerName ?? order.user?.fullName,
      customerPhone: order.customerPhone ?? undefined,
      assignedChefId: order.assignedChefId ?? undefined,
      assignedChefName: order.assignedChefName ?? undefined,
      courierId: order.courierId ?? undefined,
      courierName: order.courierName ?? undefined,
      paymentStatus: order.paymentStatus,
      paymentProvider: order.paymentProvider ?? undefined,
      paymentSessionId: order.paymentSessionId ?? undefined,
      paymentIntentId: order.paymentIntentId ?? undefined,
      paidAt: order.paidAt ? order.paidAt.toISOString() : undefined,
      items: (order.items ?? []).map((item) => ({
        menuItemId: item.menuItemId,
        name: item.menuItem?.name,
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
      status: order.status,
      subtotalAmount: Number(order.subtotalAmount ?? 0),
      totalAmount: Number(order.totalAmount ?? 0),
      rating: order.rating ?? undefined,
      review: order.review ?? undefined,
      ratedAt: order.ratedAt ? order.ratedAt.toISOString() : undefined,
      createdAt: order.createdAt?.toISOString(),
      userId: order.userId,
      userName: order.user?.fullName,
      userEmail: order.user?.email,
    };
  }
}
