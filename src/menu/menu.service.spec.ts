import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuItem } from './entities/menu-item.entity';
import { MenuItemIngredient } from './entities/menu-item-ingredient.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { MealCategory } from '../common/enums/meal-category.enum';

describe('MenuService', () => {
  let service: MenuService;

  const mockMenuItem: MenuItem = {
    id: 'uuid-1',
    name: 'Thiéboudienne',
    description: 'Riz au poisson',
    price: 3500,
    category: MealCategory.PLAT,
    available: true,
    image: null,
    meal: 'lunch',
    prepTimeMinutes: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockOrderItemsRepository = {
    count: jest.fn(),
  };

  const mockRecipeRepository = {
    delete: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(),
  };

  const mockIngredientsRepository = {
    find: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(MenuItem), useValue: mockRepository },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemsRepository,
        },
        {
          provide: getRepositoryToken(MenuItemIngredient),
          useValue: mockRecipeRepository,
        },
        {
          provide: getRepositoryToken(Ingredient),
          useValue: mockIngredientsRepository,
        },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('devrait retourner un plat existant', async () => {
      mockRepository.findOne.mockResolvedValue(mockMenuItem);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(mockMenuItem);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it("devrait lever NotFoundException si le plat n'existe pas", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('devrait retourner le cache si disponible (sans filtre catégorie)', async () => {
      mockCacheManager.get.mockResolvedValue([mockMenuItem]);

      const result = await service.findAll();

      expect(result).toEqual([mockMenuItem]);
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('devrait interroger la base et remplir le cache si vide', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue([mockMenuItem]);

      const result = await service.findAll();

      expect(result).toEqual([mockMenuItem]);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('devrait créer un plat et invalider le cache', async () => {
      mockRepository.create.mockReturnValue(mockMenuItem);
      mockRepository.save.mockResolvedValue(mockMenuItem);
      mockRepository.findOne.mockResolvedValue(mockMenuItem);

      const result = await service.create({
        name: 'Thiéboudienne',
        price: 3500,
        category: MealCategory.PLAT,
      });

      expect(result).toEqual(mockMenuItem);
      expect(mockCacheManager.del).toHaveBeenCalledWith('menu:all');
    });

    it('persiste la recette fournie et valide les ingrédients référencés', async () => {
      mockRepository.create.mockReturnValue(mockMenuItem);
      mockRepository.save.mockResolvedValue(mockMenuItem);
      mockRepository.findOne.mockResolvedValue(mockMenuItem);
      mockIngredientsRepository.find.mockResolvedValue([{ id: 'ing-1' }]);

      await service.create({
        name: 'Thiéboudienne',
        price: 3500,
        category: MealCategory.PLAT,
        recipe: [{ ingredientId: 'ing-1', quantityRequired: 0.3 }],
      });

      expect(mockRecipeRepository.delete).toHaveBeenCalledWith({
        menuItemId: mockMenuItem.id,
      });
      expect(mockRecipeRepository.save).toHaveBeenCalled();
    });

    it('refuse une recette référençant un ingrédient inconnu', async () => {
      mockRepository.create.mockReturnValue(mockMenuItem);
      mockRepository.save.mockResolvedValue(mockMenuItem);
      mockIngredientsRepository.find.mockResolvedValue([]);

      await expect(
        service.create({
          name: 'Thiéboudienne',
          price: 3500,
          category: MealCategory.PLAT,
          recipe: [{ ingredientId: 'inconnu', quantityRequired: 0.3 }],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockRecipeRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('supprime un plat jamais commandé', async () => {
      mockRepository.findOne.mockResolvedValue(mockMenuItem);
      mockOrderItemsRepository.count.mockResolvedValue(0);

      await service.remove('uuid-1');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockMenuItem);
      expect(mockCacheManager.del).toHaveBeenCalledWith('menu:all');
    });

    it('refuse de supprimer un plat déjà référencé par une commande', async () => {
      mockRepository.findOne.mockResolvedValue(mockMenuItem);
      mockOrderItemsRepository.count.mockResolvedValue(3);

      await expect(service.remove('uuid-1')).rejects.toThrow(ConflictException);
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });
});
