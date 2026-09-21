import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';

describe('UsersService', () => {
  let service: UsersService;

  const user: User = {
    id: 'user-1',
    email: 'client@linguere.sn',
    fullName: 'Client Test',
    password: 'hashed',
    role: Role.CLIENT,
    provider: AuthProvider.LOCAL,
    providerId: null,
    isEmailVerified: true,
    otpCode: null,
    otpExpiresAt: null,
    orders: [],
    createdAt: new Date(),
  };

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn((data: User) => Promise.resolve(data)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('renvoie la liste complète et son total sans pagination', async () => {
      mockRepository.findAndCount.mockResolvedValue([[user], 1]);

      const result = await service.findAll();

      expect(result).toEqual({ data: [user], total: 1 });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({});
    });

    it('applique skip/take quand la pagination est fournie', async () => {
      mockRepository.findAndCount.mockResolvedValue([[user], 42]);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
      });
    });
  });

  describe('findById', () => {
    it('lève une 404 pour un utilisateur inconnu', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retourne un utilisateur existant', async () => {
      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findById('user-1');

      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('met à jour un utilisateur existant', async () => {
      mockRepository.findOne.mockResolvedValue({ ...user });

      const result = await service.update('user-1', {
        fullName: 'Nouveau Nom',
      });

      expect(result.fullName).toBe('Nouveau Nom');
    });

    it('lève une 404 si l’utilisateur ciblé n’existe pas', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('inconnu', { fullName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
