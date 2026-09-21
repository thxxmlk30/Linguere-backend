import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { Ingredient } from './entities/ingredient.entity';
import { IngredientUnit } from '../common/enums/ingredient-unit.enum';

describe('IngredientsService', () => {
  let service: IngredientsService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: Partial<Ingredient>) => data),
    save: jest.fn((data: Ingredient) => Promise.resolve(data)),
    remove: jest.fn(),
  };

  const ingredient: Ingredient = {
    id: 'ing-1',
    name: 'Riz brisé',
    currentStock: 100,
    unit: IngredientUnit.KG,
    minStock: 40,
    reorderThreshold: 60,
    criticalStock: 20,
    supplier: null,
    costPerUnit: null,
    lastRestockedAt: new Date('2026-07-01T00:00:00.000Z'),
    lastCountedAt: new Date('2026-07-01T00:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        {
          provide: getRepositoryToken(Ingredient),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IngredientsService>(IngredientsService);
  });

  describe('update', () => {
    it('ne touche pas lastRestockedAt/lastCountedAt quand ils sont absents du DTO', async () => {
      mockRepository.findOne.mockResolvedValue({ ...ingredient });

      const result = await service.update('ing-1', { currentStock: 80 });

      expect(result.currentStock).toBe(80);
      expect(result.lastRestockedAt).toEqual(ingredient.lastRestockedAt);
      expect(result.lastCountedAt).toEqual(ingredient.lastCountedAt);
    });

    it('met à jour lastRestockedAt quand il est fourni explicitement', async () => {
      mockRepository.findOne.mockResolvedValue({ ...ingredient });

      const result = await service.update('ing-1', {
        lastRestockedAt: '2026-08-01T00:00:00.000Z',
      });

      expect(result.lastRestockedAt).toEqual(
        new Date('2026-08-01T00:00:00.000Z'),
      );
    });

    it('lève une 404 pour un ingrédient inconnu', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('inconnu', { currentStock: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
