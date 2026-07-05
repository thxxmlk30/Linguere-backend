import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Autorisation basée sur les rôles (RBAC).
 * À utiliser APRÈS JwtAuthGuard : @UseGuards(JwtAuthGuard, RolesGuard)
 * Usage : @Roles(Role.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // pas de restriction de rôle sur cette route
    }

    const { user } = context.switchToHttp().getRequest<{
      user?: { role?: Role };
    }>();

    if (!user || !user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Accès refusé : rôle requis parmi [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
