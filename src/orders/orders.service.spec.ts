import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { ServiceType } from '../common/enums/service-type.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { StaffRole } from '../common/enums/staff-role.enum';
import { StaffStatus } from '../common/enums/staff-status.enum';
import { MealCategory } from '../common/enums/meal-category.enum';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockManager = {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve(data)),
  };

  const mockOrdersRepository = {
    create: jest.fn((data: Partial<Order>) => data as Order),
    save: jest.fn((data: Order) => Promise.resolve(data)),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    softRemove: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (manager: typeof mockManager) => unknown) =>
        cb(mockManager),
      ),
    },
  };

  const mockMenuRepository = { findOne: jest.fn() };
  const mockZonesRepository = { findOne: jest.fn() };
  const mockStaffRepository = { findOne: jest.fn() };

  const adminUser = { id: 'admin-1', role: Role.ADMIN, staffId: null };
  const clientUser = { id: 'client-1', role: Role.CLIENT, staffId: null };
  const chefUser = { id: 'chef-user-1', role: Role.CHEF, staffId: 'staff-1' };
  const otherChefUser = {
    id: 'chef-user-2',
    role: Role.CHEF,
    staffId: 'staff-2',
  };
  const waiterUser = {
    id: 'waiter-user-1',
    role: Role.WAITER,
    staffId: 'staff-3',
  };
  const deliveryUser = {
    id: 'delivery-user-1',
    role: Role.DELIVERY,
    staffId: 'staff-4',
  };
  const otherDeliveryUser = {
    id: 'delivery-user-2',
    role: Role.DELIVERY,
    staffId: 'staff-5',
  };

  const menuItem: MenuItem = {
    id: 'menu-1',
    name: 'Thiéboudienne',
    description: null,
    price: 3500,
    category: MealCategory.PLAT,
    available: true,
    image: null,
    meal: 'any',
    prepTimeMinutes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const zone: DeliveryZone = {
    id: 'zone-1',
    commune: 'Plateau',
    department: 'Dakar',
    sector: 'Plateau',
    description: null,
    fee: 1500,
    etaMinutes: 20,
    lat: 0,
    lng: 0,
    mapX: 0,
    mapY: 0,
    landmarks: [],
    isActive: true,
  } as DeliveryZone;

  function buildOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 'order-1',
      userId: 'client-1',
      user: undefined,
      items: [],
      serviceType: ServiceType.DINE_IN,
      tableNumber: 1,
      deliveryZoneId: null,
      deliveryAddress: null,
      deliveryNotes: null,
      deliveryFee: 0,
      subtotalAmount: 3500,
      customerName: null,
      customerPhone: null,
      assignedChefId: null,
      assignedChefName: null,
      courierId: null,
      courierName: null,
      totalAmount: 3500,
      paymentStatus: PaymentStatus.UNPAID,
      paymentProvider: null,
      paymentSessionId: null,
      paymentIntentId: null,
      paidAt: null,
      rating: null,
      review: null,
      ratedAt: null,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    } as Order;
  }

  function buildStaff(overrides: Partial<Staff> = {}): Staff {
    return {
      id: 'staff-1',
      name: 'Moussa Sarr',
      email: 'chef1@linguere.sn',
      role: StaffRole.CHEF,
      phone: '+221770000002',
      salary: null,
      hireDate: null,
      shift: null,
      zone: null,
      status: StaffStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockOrdersRepository.create.mockImplementation(
      (data: Partial<Order>) => data as Order,
    );
    mockOrdersRepository.save.mockImplementation((data: Order) =>
      Promise.resolve(data),
    );
    mockManager.findOne.mockResolvedValue(null);
    mockManager.create.mockImplementation(
      (_entity: unknown, data: unknown) => data,
    );
    mockManager.save.mockImplementation((_entity: unknown, data: unknown) =>
      Promise.resolve(data),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        { provide: getRepositoryToken(MenuItem), useValue: mockMenuRepository },
        {
          provide: getRepositoryToken(DeliveryZone),
          useValue: mockZonesRepository,
        },
        { provide: getRepositoryToken(Staff), useValue: mockStaffRepository },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('calcule correctement le sous-total pour une commande sur place', async () => {
      mockMenuRepository.findOne.mockResolvedValue(menuItem);

      const result = await service.create('client-1', {
        serviceType: ServiceType.DINE_IN,
        tableNumber: 4,
        items: [{ menuItemId: 'menu-1', quantity: 2 }],
      });

      expect(result.subtotalAmount).toBe(7000);
      expect(result.totalAmount).toBe(7000);
    });

    it('ajoute les frais de livraison pour une commande en livraison', async () => {
      mockMenuRepository.findOne.mockResolvedValue(menuItem);
      mockZonesRepository.findOne.mockResolvedValue(zone);

      const result = await service.create('client-1', {
        serviceType: ServiceType.DELIVERY,
        deliveryZoneId: 'zone-1',
        deliveryAddress: 'Rue 10',
        items: [{ menuItemId: 'menu-1', quantity: 1 }],
      });

      expect(result.deliveryFee).toBe(1500);
      expect(result.totalAmount).toBe(5000);
    });

    it('refuse un plat introuvable', async () => {
      mockMenuRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('client-1', {
          serviceType: ServiceType.DINE_IN,
          tableNumber: 1,
          items: [{ menuItemId: 'inconnu', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuse un plat indisponible', async () => {
      mockMenuRepository.findOne.mockResolvedValue({
        ...menuItem,
        available: false,
      });

      await expect(
        service.create('client-1', {
          serviceType: ServiceType.DINE_IN,
          tableNumber: 1,
          items: [{ menuItemId: 'menu-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse une zone de livraison inconnue', async () => {
      mockMenuRepository.findOne.mockResolvedValue(menuItem);
      mockZonesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('client-1', {
          serviceType: ServiceType.DELIVERY,
          deliveryZoneId: 'zone-inconnue',
          deliveryAddress: 'Rue 10',
          items: [{ menuItemId: 'menu-1', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it("refuse l'accès à la commande d'un autre client (IDOR)", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ userId: 'un-autre-client' }),
      );

      await expect(service.findOne('order-1', clientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("un admin peut accéder à la commande de n'importe quel client", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ userId: 'un-autre-client' }),
      );

      await expect(
        service.findOne('order-1', adminUser),
      ).resolves.toBeDefined();
    });

    it('un chef assigné peut voir la commande', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ assignedChefId: 'staff-1' }),
      );

      await expect(service.findOne('order-1', chefUser)).resolves.toBeDefined();
    });

    it('un chef non assigné ne peut pas voir la commande', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ assignedChefId: 'staff-1' }),
      );

      await expect(service.findOne('order-1', otherChefUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('un serveur peut voir toute commande sur place', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ serviceType: ServiceType.DINE_IN }),
      );

      await expect(
        service.findOne('order-1', waiterUser),
      ).resolves.toBeDefined();
    });

    it('un serveur ne peut pas voir une commande en livraison', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ serviceType: ServiceType.DELIVERY }),
      );

      await expect(service.findOne('order-1', waiterUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAllForUser (filtrage par rôle)', () => {
    beforeEach(() => {
      mockOrdersRepository.findAndCount.mockResolvedValue([[], 0]);
    });

    it('un chef ne voit que les commandes qui lui sont assignées', async () => {
      await service.findAllForUser(chefUser);

      expect(mockOrdersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedChefId: 'staff-1' },
        }),
      );
    });

    it('un livreur ne voit que les commandes qui lui sont assignées', async () => {
      await service.findAllForUser(deliveryUser);

      expect(mockOrdersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { courierId: 'staff-4' } }),
      );
    });

    it('un serveur voit toutes les commandes sur place', async () => {
      await service.findAllForUser(waiterUser);

      expect(mockOrdersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { serviceType: ServiceType.DINE_IN },
        }),
      );
    });

    it('un chef sans fiche staff liée ne voit aucune commande', async () => {
      const result = await service.findAllForUser({
        id: 'chef-orphan',
        role: Role.CHEF,
        staffId: null,
      });

      expect(result).toEqual({ data: [], total: 0 });
      expect(mockOrdersRepository.findAndCount).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus (machine à états, point de vue admin)', () => {
    it('autorise pending -> preparing', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PENDING }),
      );

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.PREPARING,
        adminUser,
      );
      expect(result.status).toBe(OrderStatus.PREPARING);
    });

    it('refuse pending -> delivered (saut de statut)', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PENDING }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.DELIVERED, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse delivered -> pending (régression)', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.DELIVERED }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.PENDING, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('autorise une transition vers le même statut (no-op)', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PREPARING }),
      );

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.PREPARING,
        adminUser,
      );
      expect(result.status).toBe(OrderStatus.PREPARING);
    });
  });

  describe('updateStatus (permissions par rôle/assignation)', () => {
    it('un chef assigné peut passer pending -> preparing', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PENDING, assignedChefId: 'staff-1' }),
      );

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.PREPARING,
        chefUser,
      );
      expect(result.status).toBe(OrderStatus.PREPARING);
    });

    it('un chef non assigné à la commande est refusé', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PENDING, assignedChefId: 'staff-1' }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.PREPARING, otherChefUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un chef ne peut pas passer une commande à delivered', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.READY, assignedChefId: 'staff-1' }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.DELIVERED, chefUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un serveur peut marquer une commande sur place comme livrée', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({
          status: OrderStatus.READY,
          serviceType: ServiceType.DINE_IN,
        }),
      );

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.DELIVERED,
        waiterUser,
      );
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('un serveur ne peut pas marquer une livraison comme livrée', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({
          status: OrderStatus.READY,
          serviceType: ServiceType.DELIVERY,
        }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.DELIVERED, waiterUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un livreur assigné peut marquer sa livraison comme livrée', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({
          status: OrderStatus.READY,
          serviceType: ServiceType.DELIVERY,
          courierId: 'staff-4',
        }),
      );

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.DELIVERED,
        deliveryUser,
      );
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('un livreur non assigné à cette livraison est refusé', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({
          status: OrderStatus.READY,
          serviceType: ServiceType.DELIVERY,
          courierId: 'staff-4',
        }),
      );

      await expect(
        service.updateStatus(
          'order-1',
          OrderStatus.DELIVERED,
          otherDeliveryUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un client ne peut jamais changer le statut', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PENDING }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.PREPARING, clientUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('un client peut annuler une commande pending', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PENDING }),
      );

      const result = await service.cancel('order-1', clientUser);
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('un client ne peut pas annuler une commande preparing', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PREPARING }),
      );

      await expect(service.cancel('order-1', clientUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('un admin peut annuler une commande preparing', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.PREPARING, userId: 'client-1' }),
      );

      const result = await service.cancel('order-1', adminUser);
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('un admin ne peut pas annuler une commande ready', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.READY }),
      );

      await expect(service.cancel('order-1', adminUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("refuse l'annulation de la commande d'un autre client (IDOR)", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ userId: 'un-autre-client', status: OrderStatus.PENDING }),
      );

      await expect(service.cancel('order-1', clientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove (soft-delete)', () => {
    it('supprime (logiquement) une commande non payée et non livrée', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
        }),
      );

      await service.remove('order-1');
      expect(mockOrdersRepository.softRemove).toHaveBeenCalled();
    });

    it('refuse de supprimer une commande payée', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ paymentStatus: PaymentStatus.PAID }),
      );

      await expect(service.remove('order-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockOrdersRepository.softRemove).not.toHaveBeenCalled();
    });

    it('refuse de supprimer une commande livrée', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.DELIVERED }),
      );

      await expect(service.remove('order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assignChef / assignCourier', () => {
    it('affecte un chef valide', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockStaffRepository.findOne.mockResolvedValue(
        buildStaff({ role: StaffRole.CHEF }),
      );

      const result = await service.assignChef('order-1', {
        staffId: 'staff-1',
      });

      expect(result.assignedChefId).toBe('staff-1');
      expect(result.assignedChefName).toBe('Moussa Sarr');
    });

    it("refuse un staffId qui n'a pas le rôle chef", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockStaffRepository.findOne.mockResolvedValue(
        buildStaff({ role: StaffRole.WAITER }),
      );

      await expect(
        service.assignChef('order-1', { staffId: 'staff-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse un staffId inexistant', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockStaffRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignChef('order-1', { staffId: 'inconnu' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('retire l’affectation quand staffId est absent', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ assignedChefId: 'staff-1' }),
      );

      const result = await service.assignChef('order-1', {});
      expect(result.assignedChefId).toBeUndefined();
    });

    it('affecte un livreur valide', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockStaffRepository.findOne.mockResolvedValue(
        buildStaff({
          id: 'staff-2',
          role: StaffRole.DELIVERY,
          name: 'Cheikh Fall',
        }),
      );

      const result = await service.assignCourier('order-1', {
        staffId: 'staff-2',
      });

      expect(result.courierId).toBe('staff-2');
      expect(result.courierName).toBe('Cheikh Fall');
    });
  });

  describe('gestion du stock d’ingrédients (recette)', () => {
    function menuItemWithRecipe(
      recipe: Array<{
        ingredientId: string;
        quantityRequired: number;
        currentStock: number;
      }>,
    ) {
      return {
        ...menuItem,
        recipe: recipe.map((line) => ({
          ingredientId: line.ingredientId,
          quantityRequired: line.quantityRequired,
          ingredient: {
            id: line.ingredientId,
            name: line.ingredientId,
            currentStock: line.currentStock,
            unit: 'kg',
          },
        })),
      };
    }

    it('décrémente le stock requis à la création de la commande', async () => {
      mockMenuRepository.findOne.mockResolvedValue(menuItem);
      mockManager.findOne.mockResolvedValue(
        menuItemWithRecipe([
          { ingredientId: 'riz', quantityRequired: 0.5, currentStock: 10 },
        ]),
      );

      await service.create('client-1', {
        serviceType: ServiceType.DINE_IN,
        tableNumber: 1,
        items: [{ menuItemId: 'menu-1', quantity: 3 }],
      });

      const savedIngredient = mockManager.save.mock.calls.find(
        (call) => call[1]?.id === 'riz',
      )?.[1];
      // 3 plats x 0.5 requis = 1.5 consommé sur un stock de 10
      expect(savedIngredient.currentStock).toBe(8.5);
    });

    it('agrège la consommation du même ingrédient sur plusieurs lignes de commande', async () => {
      mockMenuRepository.findOne.mockResolvedValue(menuItem);
      mockManager.findOne.mockResolvedValue(
        menuItemWithRecipe([
          { ingredientId: 'oignon', quantityRequired: 0.2, currentStock: 5 },
        ]),
      );

      await service.create('client-1', {
        serviceType: ServiceType.DINE_IN,
        tableNumber: 1,
        items: [
          { menuItemId: 'menu-1', quantity: 2 },
          { menuItemId: 'menu-1', quantity: 3 },
        ],
      });

      const savedIngredient = mockManager.save.mock.calls.find(
        (call) => call[1]?.id === 'oignon',
      )?.[1];
      // (2 + 3) plats x 0.2 = 1.0 consommé au total
      expect(savedIngredient.currentStock).toBe(4);
    });

    it('rejette la commande sans décrémenter si le stock est insuffisant', async () => {
      mockMenuRepository.findOne.mockResolvedValue(menuItem);
      mockManager.findOne.mockResolvedValue(
        menuItemWithRecipe([
          { ingredientId: 'poisson', quantityRequired: 5, currentStock: 2 },
        ]),
      );

      await expect(
        service.create('client-1', {
          serviceType: ServiceType.DINE_IN,
          tableNumber: 1,
          items: [{ menuItemId: 'menu-1', quantity: 1 }],
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('restitue le stock consommé quand la commande est annulée', async () => {
      mockManager.findOne.mockResolvedValue(
        menuItemWithRecipe([
          { ingredientId: 'riz', quantityRequired: 0.5, currentStock: 8.5 },
        ]),
      );
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({
          status: OrderStatus.PENDING,
          items: [{ menuItemId: 'menu-1', quantity: 3 } as never],
        }),
      );

      await service.cancel('order-1', clientUser);

      const savedIngredient = mockManager.save.mock.calls.find(
        (call) => call[1]?.id === 'riz',
      )?.[1];
      expect(savedIngredient.currentStock).toBe(10);
    });
  });
});
