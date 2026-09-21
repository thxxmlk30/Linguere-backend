import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';
import { MailService } from '../mail/mail.service';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const baseUser: User = {
    id: 'user-1',
    email: 'client@linguere.sn',
    fullName: 'Client Test',
    password: 'hashed-password',
    role: Role.CLIENT,
    provider: AuthProvider.LOCAL,
    providerId: null,
    isEmailVerified: true,
    otpCode: null,
    otpExpiresAt: null,
    orders: [],
    createdAt: new Date(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockStaffRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed-jwt'),
    decode: jest.fn(),
  };

  const mockMailService: Partial<MailService> = {
    sendOtpCode: jest.fn().mockResolvedValue({ delivered: true }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockStaffRepository.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Staff), useValue: mockStaffRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('crée un compte et renvoie un message sans devOtpCode hors dev', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation(
        (data: Partial<User>) => data as User,
      );
      mockUsersRepository.save.mockResolvedValue({
        ...baseUser,
        otpCode: '123456',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register({
        email: 'nouveau@linguere.sn',
        name: 'Nouveau Client',
        password: 'MotDePasse123',
      });

      expect(result.email).toBe(baseUser.email);
      expect(result.devOtpCode).toBeUndefined();
      expect(mockMailService.sendOtpCode).toHaveBeenCalled();
    });

    it('rejette un email déjà utilisé (409)', async () => {
      mockUsersRepository.findOne.mockResolvedValue(baseUser);

      await expect(
        service.register({
          email: baseUser.email,
          name: 'X',
          password: 'MotDePasse123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('inclut devOtpCode en environnement development', async () => {
      process.env.NODE_ENV = 'development';
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation(
        (data: Partial<User>) => data as User,
      );
      mockUsersRepository.save.mockResolvedValue({
        ...baseUser,
        otpCode: '123456',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register({
        email: 'nouveau@linguere.sn',
        name: 'Nouveau Client',
        password: 'MotDePasse123',
      });

      expect(result.devOtpCode).toBeDefined();
      process.env.NODE_ENV = 'test';
    });
  });

  describe('login', () => {
    it('connecte un utilisateur avec les bons identifiants', async () => {
      mockUsersRepository.findOne.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: baseUser.email,
        password: 'MotDePasse123',
      });

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.user.id).toBe(baseUser.id);
    });

    it('rejette un mauvais mot de passe (401)', async () => {
      mockUsersRepository.findOne.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: baseUser.email, password: 'faux' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un email non vérifié (401)', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...baseUser,
        isEmailVerified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: baseUser.email, password: 'MotDePasse123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('inclut staffId quand le compte est lié à une fiche Staff', async () => {
      mockUsersRepository.findOne.mockResolvedValue(baseUser);
      mockStaffRepository.findOne.mockResolvedValue({ id: 'staff-1' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: baseUser.email,
        password: 'MotDePasse123',
      });

      expect(result.user.staffId).toBe('staff-1');
    });

    it('renvoie staffId à null quand le compte n’est lié à aucune fiche Staff', async () => {
      mockUsersRepository.findOne.mockResolvedValue(baseUser);
      mockStaffRepository.findOne.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: baseUser.email,
        password: 'MotDePasse123',
      });

      expect(result.user.staffId).toBeNull();
    });
  });

  describe('verifyOtp', () => {
    it('rejette un code expiré (400)', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...baseUser,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyOtp({ email: baseUser.email, code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un code incorrect (400)', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...baseUser,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyOtp({ email: baseUser.email, code: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('valide un code correct et renvoie un token', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...baseUser,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 60_000),
      });
      mockUsersRepository.save.mockImplementation((u: User) => u);

      const result = await service.verifyOtp({
        email: baseUser.email,
        code: '123456',
      });

      expect(result.accessToken).toBe('signed-jwt');
    });
  });

  describe('logout', () => {
    it('blackliste le jti du token avec le TTL restant', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      mockJwtService.decode.mockReturnValue({ jti: 'abc-123', exp });

      await service.logout('some.jwt.token');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'auth:blacklist:abc-123',
        true,
        expect.any(Number),
      );
    });

    it('ne blackliste rien si le token est déjà expiré', async () => {
      mockJwtService.decode.mockReturnValue({
        jti: 'abc-123',
        exp: Math.floor(Date.now() / 1000) - 10,
      });

      await service.logout('some.jwt.token');

      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('google exchange code', () => {
    it('stocke puis consomme un code à usage unique', async () => {
      const authResponse = {
        accessToken: 'jwt',
        user: {
          id: '1',
          name: 'A',
          email: 'a@b.com',
          role: Role.CLIENT,
          staffId: null,
        },
      };
      mockCacheManager.get.mockResolvedValue(authResponse);

      const code = await service.createGoogleExchangeCode(authResponse);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `auth:google-exchange:${code}`,
        authResponse,
        expect.any(Number),
      );

      const consumed = await service.consumeGoogleExchangeCode(code);
      expect(consumed).toEqual(authResponse);
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `auth:google-exchange:${code}`,
      );
    });

    it('rejette un code invalide ou expiré', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      await expect(
        service.consumeGoogleExchangeCode('inconnu'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
