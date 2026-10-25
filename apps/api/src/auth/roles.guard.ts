import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Role } from '../generated/prisma/client.js';
import { type AuthenticatedRequest, ROLES } from './auth.decorators.js';

/** Runs after JwtAuthGuard; routes without @Roles() are open to any user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (user && roles.includes(user.role)) return true;
    throw new ForbiddenException('Bu işlem için yetkiniz yok');
  }
}
