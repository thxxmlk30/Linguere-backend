import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User } from '../../users/entities/user.entity';

const JWT_BLACKLIST_PREFIX = 'auth:blacklist:';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private usersRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // passport-jwt's Strategy typing is too loose under this lint setup.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest: (request: { headers?: { authorization?: string } }) => {
        const authorization = request.headers?.authorization;

        if (!authorization) {
          return null;
        }

        const [scheme, token] = authorization.split(' ');
        return scheme === 'Bearer' ? token : null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    jti?: string;
  }) {
    if (payload.jti) {
      const blacklisted = await this.cacheManager.get(
        `${JWT_BLACKLIST_PREFIX}${payload.jti}`,
      );
      if (blacklisted) {
        throw new UnauthorizedException('Session expiree, reconnectez-vous');
      }
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Ce qui est retourné ici est injecté dans request.user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
  }
}
