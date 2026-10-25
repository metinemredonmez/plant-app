import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Role } from '../generated/prisma/client.js';
import { RolesGuard } from './roles.guard.js';

function contextFor(role?: Role): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 1, role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

function guardRequiring(roles?: Role[]) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('lets any signed-in user through when no roles are required', () => {
    expect(guardRequiring(undefined).canActivate(contextFor('CUSTOMER'))).toBe(
      true,
    );
  });

  it('allows a matching role', () => {
    expect(guardRequiring(['ADMIN']).canActivate(contextFor('ADMIN'))).toBe(
      true,
    );
  });

  it('rejects customers on admin routes with 403', () => {
    expect(() =>
      guardRequiring(['ADMIN', 'STAFF']).canActivate(contextFor('CUSTOMER')),
    ).toThrow(ForbiddenException);
  });
});
