import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { AuthProvider } from '../../common/enums/auth-provider.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const baseUser: User = {
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

  const mockUsersRepository = { findOne: jest.fn() };
  const mockCacheManager = { get: jest.fn() };
  const mockConfigService = { get: jest.fn().mockReturnValue('test-secret') };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('valide un payload correspondant à un utilisateur existant', async () => {
    mockCacheManager.get.mockResolvedValue(undefined);
    mockUsersRepository.findOne.mockResolvedValue(baseUser);

    const result = await strategy.validate({
      sub: baseUser.id,
      email: baseUser.email,
      role: baseUser.role,
      jti: 'jti-1',
    });

    expect(result.id).toBe(baseUser.id);
  });

  it('rejette un token dont le jti est blacklisté', async () => {
    mockCacheManager.get.mockResolvedValue(true);

    await expect(
      strategy.validate({
        sub: baseUser.id,
        email: baseUser.email,
        role: baseUser.role,
        jti: 'jti-revoked',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockUsersRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejette un utilisateur introuvable', async () => {
    mockCacheManager.get.mockResolvedValue(undefined);
    mockUsersRepository.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'inconnu',
        email: 'x@y.com',
        role: Role.CLIENT,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
