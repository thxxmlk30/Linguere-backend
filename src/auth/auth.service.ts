import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { MailService } from '../mail/mail.service';
import { isDevEnvironment } from '../common/utils/env.util';

const OTP_TTL_MINUTES = 10;
const GOOGLE_EXCHANGE_CODE_TTL_MS = 60 * 1000;
const JWT_BLACKLIST_PREFIX = 'auth:blacklist:';
const GOOGLE_EXCHANGE_PREFIX = 'auth:google-exchange:';

interface GoogleProfile {
  providerId: string;
  email: string;
  fullName: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      email: dto.email,
      fullName: dto.name,
      password: hashedPassword,
      role: Role.CLIENT,
      provider: AuthProvider.LOCAL,
      isEmailVerified: false,
    });

    const saved = await this.usersRepository.save(user);
    const otpResult = await this.generateAndSendOtp(saved);

    const response: {
      message: string;
      email: string;
      devOtpCode?: string;
    } = {
      message:
        'Compte créé. Un code de vérification à 6 chiffres a été envoyé par email.',
      email: saved.email,
    };

    if (isDevEnvironment()) {
      response.devOtpCode = otpResult.code;
    }

    return response;
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(dto.password, user.password))
    ) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Email non vérifié. Demandez un nouveau code via /auth/otp/request.',
      );
    }

    return this.buildAuthResponse(user);
  }

  async requestOtp(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      return { message: 'Si ce compte existe, un code a été envoyé.' };
    }

    const otpResult = await this.generateAndSendOtp(user);
    const response: { message: string; devOtpCode?: string } = {
      message: 'Un code de vérification a été envoyé par email.',
    };

    if (isDevEnvironment()) {
      response.devOtpCode = otpResult.code;
    }

    return response;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('Aucun code en attente pour cet email');
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expiré, demandez-en un nouveau');
    }

    if (user.otpCode !== dto.code) {
      throw new BadRequestException('Code incorrect');
    }

    user.isEmailVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    const saved = await this.usersRepository.save(user);

    return this.buildAuthResponse(saved);
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (user && user.provider === AuthProvider.LOCAL) {
      const otpResult = await this.generateAndSendOtp(user);
      const response: { message: string; devOtpCode?: string } = {
        message: 'Si ce compte existe, un code a été envoyé par email.',
      };

      if (isDevEnvironment()) {
        response.devOtpCode = otpResult.code;
      }

      return response;
    }

    return {
      message: 'Si ce compte existe, un code a été envoyé par email.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expiré, refaites une demande');
    }

    if (user.otpCode !== dto.code) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.isEmailVerified = true;
    await this.usersRepository.save(user);

    return {
      message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
    };
  }

  async me(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role,
    };
  }

  async validateOAuthLogin(profile: GoogleProfile) {
    let user = await this.usersRepository.findOne({
      where: { email: profile.email },
    });

    if (!user) {
      user = this.usersRepository.create({
        email: profile.email,
        fullName: profile.fullName,
        password: null,
        role: Role.CLIENT,
        provider: AuthProvider.GOOGLE,
        providerId: profile.providerId,
        isEmailVerified: true,
      });
      user = await this.usersRepository.save(user);
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Stocke un token deja emis pour ce user derriere un code opaque a usage
   * unique (TTL 60s), pour eviter de faire transiter le JWT en clair dans
   * l'URL de redirection OAuth (historique navigateur, logs, header Referer).
   */
  async createGoogleExchangeCode(authResponse: {
    accessToken: string;
    user: { id: string; name: string; email: string; role: Role };
  }): Promise<string> {
    const code = randomUUID();
    await this.cacheManager.set(
      `${GOOGLE_EXCHANGE_PREFIX}${code}`,
      authResponse,
      GOOGLE_EXCHANGE_CODE_TTL_MS,
    );
    return code;
  }

  async consumeGoogleExchangeCode(code: string) {
    const key = `${GOOGLE_EXCHANGE_PREFIX}${code}`;
    const authResponse = await this.cacheManager.get<{
      accessToken: string;
      user: { id: string; name: string; email: string; role: Role };
    }>(key);

    if (!authResponse) {
      throw new BadRequestException('Code d echange invalide ou expire');
    }

    await this.cacheManager.del(key);
    return authResponse;
  }

  /**
   * Revoque le token courant en blacklistant son jti jusqu'a expiration
   * naturelle (le JWT reste stateless, seul ce jti devient invalide).
   */
  async logout(token: string) {
    const decoded = this.jwtService.decode<{ jti?: string; exp?: number }>(
      token,
    );

    if (decoded?.jti && decoded.exp) {
      const ttlMs = decoded.exp * 1000 - Date.now();
      if (ttlMs > 0) {
        await this.cacheManager.set(
          `${JWT_BLACKLIST_PREFIX}${decoded.jti}`,
          true,
          ttlMs,
        );
      }
    }

    return { message: 'Deconnecte' };
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const value = await this.cacheManager.get(`${JWT_BLACKLIST_PREFIX}${jti}`);
    return Boolean(value);
  }

  private async generateAndSendOtp(
    user: User,
  ): Promise<{ code: string; delivered: boolean }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = code;
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await this.usersRepository.save(user);

    const result = await this.mailService.sendOtpCode(
      user.email,
      user.fullName,
      code,
    );
    return { code, delivered: result.delivered };
  }

  private buildAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
