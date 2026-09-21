import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../users/entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';
import { MailModule } from '../mail/mail.module';

// passport-google-oauth20 lève une exception synchrone a l'instanciation
// si clientID/clientSecret sont vides : sans ce garde, toute l'application
// (y compris le script de seed) refuse de demarrer des que ces variables
// ne sont pas configurees, meme si personne n'utilise la connexion Google.
const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Staff]),
    PassportModule,
    ConfigModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? '',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN', '1d') ??
            '1d') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    ...(googleOAuthConfigured ? [GoogleStrategy] : []),
  ],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
