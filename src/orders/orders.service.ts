import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { Staff } from '../staff/entities/staff.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { ServiceType } from '../common/enums/service-type.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { StaffRole } from '../common/enums/staff-role.enum';
import { AssignOrderStaffDto } from './dto/assign-order-staff.dto';
import { RateOrderDto } from './dto/rate-order.dto';

interface AuthUser {
  id: string;
  role: Role;
}

// Transitions autorisees pour updateStatus() : un admin ne peut pas faire
// regresser ou sauter une commande d'un statut a un autre arbitrairement.
const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(MenuItem) private menuRepository: Repository<MenuItem>,
    @InjectRepository(DeliveryZone)
    private zonesRepository: Repository<DeliveryZone>,
    @InjectRepository(Staff) private staffRepository: Repository<Staff>,
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
    if (dto.serviceType === ServiceType.DELIVERY) {
      const zone = await this.zonesRepository.findOne({
        where: { id: dto.deliveryZoneId },
      });

      if (!zone) {
        throw new NotFoundException('Zone de livraison introuvable');
      }

      deliveryFee = Number(zone.fee);
    }

    // Transaction : verifier et decrementer le stock d'ingredients requis
    // par la recette de chaque plat, et ne creer la commande que si tout le
    // stock est disponible (rollback complet sinon).
    const saved = await this.ordersRepository.manager.transaction(
      async (manager) => {
        await this.reserveIngredientStock(dto.items, manager);

        const order = manager.create(Order, {
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
          paymentStatus: PaymentStatus.UNPAID,
          paymentProvider: null,
          paymentSessionId: null,
          paymentIntentId: null,
          paidAt: null,
          deliveryFee,
          subtotalAmount,
          totalAmount: subtotalAmount + deliveryFee,
          status: OrderStatus.PENDING,
        });

        return manager.save(Order, order);
      },
    );

    return this.toResponse(saved);
  }

  /**
   * Agrege, pour un ensemble de lignes {menuItemId, quantity}, la quantite
   * totale requise par ingredient d'apres la recette de chaque plat. Les
   * plats sans recette configuree n'imposent aucune contrainte de stock.
   */
  private async computeIngredientRequirements(
    lines: Array<{ menuItemId: string; quantity: number }>,
    manager: EntityManager,
  ): Promise<Map<string, { ingredient: Ingredient; required: number }>> {
    const requirements = new Map<
      string,
      { ingredient: Ingredient; required: number }
    >();

    for (const line of lines) {
      const menuItem = await manager.findOne(MenuItem, {
        where: { id: line.menuItemId },
        relations: { recipe: { ingredient: true } },
      });

      if (!menuItem?.recipe?.length) {
        continue;
      }

      for (const recipeLine of menuItem.recipe) {
        const additional = recipeLine.quantityRequired * line.quantity;
        const existing = requirements.get(recipeLine.ingredientId);

        if (existing) {
          existing.required += additional;
        } else {
          requirements.set(recipeLine.ingredientId, {
            ingredient: recipeLine.ingredient,
            required: additional,
          });
        }
      }
    }

    return requirements;
  }

  private async reserveIngredientStock(
    lines: Array<{ menuItemId: string; quantity: number }>,
    manager: EntityManager,
  ) {
    const requirements = await this.computeIngredientRequirements(
      lines,
      manager,
    );
    if (requirements.size === 0) {
      return;
    }

    const shortages: string[] = [];
    for (const { ingredient, required } of requirements.values()) {
      if (ingredient.currentStock < required) {
        shortages.push(
          `${ingredient.name} (disponible: ${ingredient.currentStock}${ingredient.unit}, requis: ${required}${ingredient.unit})`,
        );
      }
    }

    if (shortages.length > 0) {
      throw new ConflictException(
        `Stock insuffisant pour préparer cette commande : ${shortages.join(', ')}`,
      );
    }

    for (const { ingredient, required } of requirements.values()) {
      ingredient.currentStock -= required;
      await manager.save(Ingredient, ingredient);
    }
  }

  private async restoreIngredientStock(
    lines: Array<{ menuItemId: string; quantity: number }>,
    manager: EntityManager,
  ) {
    const requirements = await this.computeIngredientRequirements(
      lines,
      manager,
    );

    for (const { ingredient, required } of requirements.values()) {
      ingredient.currentStock += required;
      await manager.save(Ingredient, ingredient);
    }
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

    if (status !== order.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[order.status];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Transition de statut invalide : ${order.status} -> ${status}`,
        );
      }
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

    // Un client ne peut annuler que tant que rien n'a commence ; un admin
    // peut encore annuler pendant la preparation, mais plus une fois la
    // commande prete/livree.
    const cancellableStatuses =
      user.role === Role.ADMIN
        ? [OrderStatus.PENDING, OrderStatus.PREPARING]
        : [OrderStatus.PENDING];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Cette commande ne peut plus être annulée à ce stade',
      );
    }

    // Le stock reserve a la creation est restitue : les ingredients n'ont
    // pas ete physiquement utilises puisque la commande est annulee.
    const saved = await this.ordersRepository.manager.transaction(
      async (manager) => {
        await this.restoreIngredientStock(
          order.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
          })),
          manager,
        );
        order.status = OrderStatus.CANCELLED;
        return manager.save(Order, order);
      },
    );

    return this.toResponse(saved);
  }

  async assignChef(id: string, dto: AssignOrderStaffDto) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    const chef = await this.resolveStaffMember(dto.staffId, StaffRole.CHEF);
    order.assignedChefId = chef?.id ?? null;
    order.assignedChefName = chef?.name ?? null;
    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  async assignCourier(id: string, dto: AssignOrderStaffDto) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${id})`);
    }

    const courier = await this.resolveStaffMember(
      dto.staffId,
      StaffRole.DELIVERY,
    );
    order.courierId = courier?.id ?? null;
    order.courierName = courier?.name ?? null;
    const saved = await this.ordersRepository.save(order);
    return this.toResponse(saved);
  }

  /**
   * Verifie que le staffId fourni existe et occupe bien le role attendu,
   * plutot que de faire confiance au staffName fourni par le client.
   * staffId absent/null => on retire l'affectation (retour null).
   */
  private async resolveStaffMember(
    staffId: string | undefined,
    expectedRole: StaffRole,
  ) {
    if (!staffId) {
      return null;
    }

    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException(
        `Membre du personnel introuvable (id: ${staffId})`,
      );
    }

    if (staff.role !== expectedRole) {
      throw new BadRequestException(
        `${staff.name} n'a pas le rôle "${expectedRole}"`,
      );
    }

    return staff;
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

    // Une commande payee ou livree ne doit jamais disparaitre : c'est de
    // l'historique financier consulte par le module reports.
    if (
      order.paymentStatus === PaymentStatus.PAID ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Une commande payée ou livrée ne peut pas être supprimée',
      );
    }

    await this.ordersRepository.softRemove(order);
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
