import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';

import type { Role } from '../generated/prisma/client.js';

/** The caller, as read from a verified access token. */
export interface AuthUser {
  id: number;
  role: Role;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };

export const IS_PUBLIC = 'isPublic';
/** Opts a route or controller out of the global access-token check. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
/** Restricts a route or controller to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const AUTH_RATE_LIMITED = 'authRateLimited';
/** Puts a route under the stricter per-IP limit (AUTH_RATE_LIMIT). */
export const AuthRateLimited = () => SetMetadata(AUTH_RATE_LIMITED, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new Error('CurrentUser used on a public route');
    return user;
  },
);
