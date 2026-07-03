import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuItem } from './entities/menu-item.entity';
import { MealCategory } from '../common/enums/meal-category.enum';

describe('MenuService', () => {
  let service: MenuService;

  const mockMenuItem: MenuItem = {
    id: 'uuid-1',
    name: 'Thiéboudienne',
    description: 'Riz au poisson',
    price: 3500,
    category: MealCategory.LUNCH,
    available: true,
    imageUrl: null,
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

    it('devrait lever NotFoundException si le plat n\'existe pas', async () => {
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

      const result = await service.create({
        name: 'Thiéboudienne',
        price: 3500,
        category: MealCategory.LUNCH,
      });

      expect(result).toEqual(mockMenuItem);
      expect(mockCacheManager.del).toHaveBeenCalledWith('menu:all');
    });
  });
});
