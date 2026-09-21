import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';
import { StaffRole } from '../common/enums/staff-role.enum';
import { StaffStatus } from '../common/enums/staff-status.enum';

describe('StaffService', () => {
  let service: StaffService;

  const staff: Staff = {
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
  };

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: Partial<Staff>) => data),
    save: jest.fn((data: Staff) => Promise.resolve(data)),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: getRepositoryToken(Staff), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  describe('create', () => {
    it('crée un membre du personnel', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.create({
        name: 'Fatou Sow',
        email: 'waiter1@linguere.sn',
        role: StaffRole.WAITER,
        phone: '+221770000003',
      });

      expect(result).toBeDefined();
    });

    it('refuse un email déjà utilisé (409)', async () => {
      mockRepository.findOne.mockResolvedValue(staff);

      await expect(
        service.create({
          name: 'Doublon',
          email: staff.email,
          role: StaffRole.CHEF,
          phone: '+221770000099',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('lève une 404 pour un membre inconnu', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('lève une 404 si le membre ciblé n’existe pas', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('inconnu', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('met à jour un membre existant', async () => {
      mockRepository.findOne.mockResolvedValue({ ...staff });

      const result = await service.update('staff-1', {
        shift: 'Soir',
      });

      expect(result.shift).toBe('Soir');
    });
  });

  describe('remove', () => {
    it('lève une 404 si le membre ciblé n’existe pas', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('supprime un membre existant', async () => {
      mockRepository.findOne.mockResolvedValue(staff);

      await service.remove('staff-1');

      expect(mockRepository.remove).toHaveBeenCalledWith(staff);
    });
  });
});
