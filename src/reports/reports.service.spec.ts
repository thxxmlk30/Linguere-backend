import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';

function buildFluentQueryBuilder(terminalResults: Record<string, unknown>) {
  const builder: Record<string, jest.Mock> = {};
  const chainMethods = [
    'select',
    'addSelect',
    'innerJoin',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'limit',
  ];

  for (const method of chainMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  for (const [terminal, value] of Object.entries(terminalResults)) {
    builder[terminal] = jest.fn().mockResolvedValue(value);
  }

  return builder;
}

describe('ReportsService', () => {
  let service: ReportsService;

  const mockOrdersRepository = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };
  const mockOrderItemsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const mockIngredientsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const mockMenuRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemsRepository,
        },
        {
          provide: getRepositoryToken(Ingredient),
          useValue: mockIngredientsRepository,
        },
        {
          provide: getRepositoryToken(MenuItem),
          useValue: mockMenuRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('dashboard', () => {
    function mockDashboardQueries({
      todayStats,
      pendingOrders,
      cancelledOrdersToday,
      averageRating,
      ingredientsLow,
    }: {
      todayStats: Record<string, string>;
      pendingOrders: number;
      cancelledOrdersToday: number;
      averageRating: string | null;
      ingredientsLow: number;
    }) {
      const ordersQueryBuilder = buildFluentQueryBuilder({});
      ordersQueryBuilder.getRawOne = jest
        .fn()
        .mockResolvedValueOnce(todayStats)
        .mockResolvedValueOnce({ averageRating });
      mockOrdersRepository.createQueryBuilder.mockReturnValue(
        ordersQueryBuilder,
      );
      mockOrdersRepository.count
        .mockResolvedValueOnce(pendingOrders)
        .mockResolvedValueOnce(cancelledOrdersToday);
      mockIngredientsRepository.createQueryBuilder.mockReturnValue(
        buildFluentQueryBuilder({ getCount: ingredientsLow }),
      );
    }

    it('agrège les statistiques du jour en excluant les commandes annulées', async () => {
      mockDashboardQueries({
        todayStats: {
          todayOrders: '5',
          todayRevenue: '25000',
          deliveryOrders: '3',
          dineInOrders: '2',
        },
        pendingOrders: 4,
        cancelledOrdersToday: 1,
        averageRating: '4.5',
        ingredientsLow: 2,
      });

      const result = await service.dashboard();

      expect(result).toEqual({
        todayOrders: 5,
        todayRevenue: 25000,
        deliveryOrders: 3,
        dineInOrders: 2,
        pendingOrders: 4,
        ingredientsLow: 2,
        cancelledOrdersToday: 1,
        averageRating: 4.5,
      });
    });

    it('renvoie 0 pour deliveryOrders/dineInOrders quand aucune commande aujourd’hui', async () => {
      mockDashboardQueries({
        todayStats: { todayOrders: '0', todayRevenue: '0' },
        pendingOrders: 0,
        cancelledOrdersToday: 0,
        averageRating: null,
        ingredientsLow: 0,
      });

      const result = await service.dashboard();

      expect(result.deliveryOrders).toBe(0);
      expect(result.dineInOrders).toBe(0);
    });

    it('renvoie averageRating à null quand aucune commande n’a été notée', async () => {
      mockDashboardQueries({
        todayStats: { todayOrders: '0', todayRevenue: '0' },
        pendingOrders: 0,
        cancelledOrdersToday: 0,
        averageRating: null,
        ingredientsLow: 0,
      });

      const result = await service.dashboard();

      expect(result.averageRating).toBeNull();
    });
  });

  describe('topItems', () => {
    it('applique la limite fournie, trie par quantité vendue et convertit les totaux en nombres', async () => {
      const qb = buildFluentQueryBuilder({
        getRawMany: [
          {
            menuItemId: 'a',
            name: 'Thiéboudienne',
            totalQuantity: '10',
            totalRevenue: '35000',
          },
        ],
      });
      mockOrderItemsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.topItems(3);

      expect(qb.limit).toHaveBeenCalledWith(3);
      expect(result).toEqual([
        {
          menuItemId: 'a',
          name: 'Thiéboudienne',
          totalQuantity: 10,
          totalRevenue: 35000,
        },
      ]);
    });

    it('utilise 5 comme limite par défaut', async () => {
      const qb = buildFluentQueryBuilder({ getRawMany: [] });
      mockOrderItemsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.topItems();

      expect(qb.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('revenueTrend', () => {
    it('comble les jours sans commande avec des valeurs à zéro', async () => {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const qb = buildFluentQueryBuilder({
        getRawMany: [{ date: todayKey, orders: '2', revenue: '7000' }],
      });
      mockOrdersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.revenueTrend(3);

      expect(result).toHaveLength(3);
      expect(result.filter((day) => day.orders === 0)).toHaveLength(2);
      expect(
        result.some((day) => day.orders === 2 && day.revenue === 7000),
      ).toBe(true);
    });
  });

  describe('cancellationStats', () => {
    it('calcule le taux d’annulation sur la période demandée', async () => {
      mockOrdersRepository.count
        .mockResolvedValueOnce(20) // totalOrders
        .mockResolvedValueOnce(5); // cancelledOrders

      const result = await service.cancellationStats(30);

      expect(result).toEqual({
        totalOrders: 20,
        cancelledOrders: 5,
        cancellationRate: 25,
      });
    });

    it('renvoie un taux de 0 sans division par zéro quand il n’y a aucune commande', async () => {
      mockOrdersRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.cancellationStats(30);

      expect(result.cancellationRate).toBe(0);
    });
  });

  describe('profitability', () => {
    it('calcule la marge uniquement pour les plats dont tous les ingrédients ont un coût connu', async () => {
      mockMenuRepository.find.mockResolvedValue([
        {
          id: 'menu-1',
          name: 'Thiéboudienne',
          recipe: [
            {
              quantityRequired: 0.3,
              ingredient: { costPerUnit: 1000 },
            },
            {
              quantityRequired: 0.2,
              ingredient: { costPerUnit: 500 },
            },
          ],
        },
        {
          id: 'menu-2',
          name: 'Plat sans coût connu',
          recipe: [{ quantityRequired: 1, ingredient: { costPerUnit: null } }],
        },
        {
          id: 'menu-3',
          name: 'Plat sans recette',
          recipe: [],
        },
      ]);

      const qb = buildFluentQueryBuilder({
        getRawMany: [
          {
            menuItemId: 'menu-1',
            name: 'Thiéboudienne',
            quantitySold: '10',
            revenue: '35000',
          },
        ],
      });
      mockOrderItemsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.profitability(10);

      // coût unitaire = 0.3*1000 + 0.2*500 = 400 ; coût total = 400*10 = 4000
      expect(result).toEqual([
        {
          menuItemId: 'menu-1',
          name: 'Thiéboudienne',
          quantitySold: 10,
          revenue: 35000,
          cost: 4000,
          margin: 31000,
          marginPercent: 88.6,
        },
      ]);
    });

    it('renvoie un tableau vide sans interroger les ventes si aucun plat n’a de coût connu', async () => {
      mockMenuRepository.find.mockResolvedValue([
        { id: 'menu-2', name: 'Plat sans recette', recipe: [] },
      ]);

      const result = await service.profitability(10);

      expect(result).toEqual([]);
      expect(
        mockOrderItemsRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });
  });
});
