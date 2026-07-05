import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { MailService } from '../mail/mail.service';

const OTP_TTL_MINUTES = 10;

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
    await this.generateAndSendOtp(saved);

    return {
      message:
        'Compte créé. Un code de vérification à 6 chiffres a été envoyé par email.',
      email: saved.email,
    };
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

    await this.generateAndSendOtp(user);
    return { message: 'Un code de vérification a été envoyé par email.' };
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
      await this.generateAndSendOtp(user);
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

  private async generateAndSendOtp(user: User): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = code;
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await this.usersRepository.save(user);

    await this.mailService.sendOtpCode(user.email, user.fullName, code);
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

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
