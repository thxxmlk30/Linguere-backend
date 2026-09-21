import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';

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
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('dashboard', () => {
    it('agrège les statistiques du jour en excluant les commandes annulées', async () => {
      mockOrdersRepository.createQueryBuilder.mockReturnValue(
        buildFluentQueryBuilder({
          getRawOne: {
            todayOrders: '5',
            todayRevenue: '25000',
            deliveryOrders: '3',
            dineInOrders: '2',
          },
        }),
      );
      mockOrdersRepository.count.mockResolvedValue(4);
      mockIngredientsRepository.createQueryBuilder.mockReturnValue(
        buildFluentQueryBuilder({ getCount: 2 }),
      );

      const result = await service.dashboard();

      expect(result).toEqual({
        todayOrders: 5,
        todayRevenue: 25000,
        deliveryOrders: 3,
        dineInOrders: 2,
        pendingOrders: 4,
        ingredientsLow: 2,
      });
    });

    it('renvoie 0 pour deliveryOrders/dineInOrders quand aucune commande aujourd’hui', async () => {
      mockOrdersRepository.createQueryBuilder.mockReturnValue(
        buildFluentQueryBuilder({
          getRawOne: { todayOrders: '0', todayRevenue: '0' },
        }),
      );
      mockOrdersRepository.count.mockResolvedValue(0);
      mockIngredientsRepository.createQueryBuilder.mockReturnValue(
        buildFluentQueryBuilder({ getCount: 0 }),
      );

      const result = await service.dashboard();

      expect(result.deliveryOrders).toBe(0);
      expect(result.dineInOrders).toBe(0);
    });
  });

  describe('topItems', () => {
    it('applique la limite fournie et trie par quantité vendue', async () => {
      const qb = buildFluentQueryBuilder({
        getRawMany: [
          { menuItemId: 'a', name: 'Thiéboudienne', totalQuantity: '10' },
        ],
      });
      mockOrderItemsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.topItems(3);

      expect(qb.limit).toHaveBeenCalledWith(3);
      expect(result).toEqual([
        { menuItemId: 'a', name: 'Thiéboudienne', totalQuantity: '10' },
      ]);
    });

    it('utilise 5 comme limite par défaut', async () => {
      const qb = buildFluentQueryBuilder({ getRawMany: [] });
      mockOrderItemsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.topItems();

      expect(qb.limit).toHaveBeenCalledWith(5);
    });
  });
});
