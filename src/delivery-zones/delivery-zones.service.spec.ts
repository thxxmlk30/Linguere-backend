import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';
import { DeliveryZone } from './entities/delivery-zone.entity';

describe('DeliveryZonesService', () => {
  let service: DeliveryZonesService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: Partial<DeliveryZone>) => data),
    save: jest.fn((data: DeliveryZone) => Promise.resolve(data)),
    remove: jest.fn(),
  };

  const zone: DeliveryZone = {
    id: 'dkr-plateau-centre',
    commune: 'Plateau',
    department: 'Dakar',
    sector: 'Plateau centre',
    description: null,
    fee: 1000,
    etaMinutes: 25,
    lat: 14.6937,
    lng: -17.4441,
    mapX: 120,
    mapY: 80,
    landmarks: [],
    isActive: true,
  } as DeliveryZone;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryZonesService,
        {
          provide: getRepositoryToken(DeliveryZone),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DeliveryZonesService>(DeliveryZonesService);
  });

  describe('create', () => {
    it('refuse un id de zone déjà utilisé', async () => {
      mockRepository.findOne.mockResolvedValue(zone);

      await expect(service.create({ ...zone } as never)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it("ignore un id fourni dans le body et conserve l'id ciblé par l'URL", async () => {
      mockRepository.findOne.mockResolvedValue({ ...zone });

      const maliciousDto = {
        id: 'un-autre-id-vise-a-corrompre-la-cle',
        commune: 'Nouvelle Commune',
      };

      const result = await service.update('dkr-plateau-centre', maliciousDto);

      expect(result.id).toBe('dkr-plateau-centre');
      expect(result.commune).toBe('Nouvelle Commune');
    });

    it('lève une 404 si la zone ciblée n’existe pas', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('inconnue', { commune: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
