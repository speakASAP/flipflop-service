/**
 * Roles Guard - checks request.user.roles (set by JwtAuthGuard) against @Roles().
 * Use after JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('...')
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesMetadata = this.reflector.getAllAndOverride<{
      roles: string[];
      requireAll?: boolean;
    }>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!rolesMetadata?.roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRoles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    const requiredRoles = rolesMetadata.roles;
    const requireAll = rolesMetadata.requireAll ?? false;

    if (requireAll) {
      const hasAll = requiredRoles.every((r) => userRoles.includes(r));
      if (!hasAll) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else {
      const hasAny = requiredRoles.some((r) => userRoles.includes(r));
      if (!hasAny) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
    return true;
  }
}
