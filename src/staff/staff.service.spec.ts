import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { StaffRole } from '../common/enums/staff-role.enum';
import { StaffStatus } from '../common/enums/staff-status.enum';
import { Role } from '../common/enums/role.enum';

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
    userId: null,
    user: null,
  };

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: Partial<Staff>) => data),
    save: jest.fn((data: Staff) => Promise.resolve(data)),
    remove: jest.fn(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
    create: jest.fn((data: Partial<User>) => data as User),
    save: jest.fn((data: User) =>
      Promise.resolve({ ...data, id: 'user-new-1' }),
    ),
  };

  const mockMailService: Partial<MailService> = {
    sendStaffCredentials: jest.fn().mockResolvedValue({ delivered: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockUsersRepository.create.mockImplementation(
      (data: Partial<User>) => data as User,
    );
    mockUsersRepository.save.mockImplementation((data: User) =>
      Promise.resolve({ ...data, id: 'user-new-1' }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: getRepositoryToken(Staff), useValue: mockRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: MailService, useValue: mockMailService },
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

  describe('provisionAccount', () => {
    it('crée un compte lié avec le rôle dérivé du rôle staff', async () => {
      mockRepository.findOne.mockResolvedValue({ ...staff, userId: null });
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.provisionAccount('staff-1', {});

      expect(mockUsersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: staff.email, role: Role.CHEF }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-new-1' }),
      );
      expect(result.email).toBe(staff.email);
      expect(mockMailService.sendStaffCredentials).toHaveBeenCalled();
    });

    it('inclut devPassword hors production', async () => {
      mockRepository.findOne.mockResolvedValue({ ...staff, userId: null });
      mockUsersRepository.findOne.mockResolvedValue(null);
      process.env.NODE_ENV = 'development';

      const result = await service.provisionAccount('staff-1', {});

      expect(result.devPassword).toBeDefined();
      process.env.NODE_ENV = 'test';
    });

    it('refuse si un accès existe déjà (409)', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...staff,
        userId: 'user-existing',
      });

      await expect(service.provisionAccount('staff-1', {})).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersRepository.save).not.toHaveBeenCalled();
    });

    it("refuse si l'email est déjà utilisé par un compte non lié (409)", async () => {
      mockRepository.findOne.mockResolvedValue({ ...staff, userId: null });
      mockUsersRepository.findOne.mockResolvedValue({ id: 'other-user' });

      await expect(service.provisionAccount('staff-1', {})).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersRepository.save).not.toHaveBeenCalled();
    });
  });
});
