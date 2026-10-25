import { ForbiddenException } from '@nestjs/common';

import type { AuthUser } from './auth.decorators.js';

/**
 * The legacy routes carry the user id in the path (`/api/user/:id`). The id
 * must be the caller's own: anything else is the IDOR the template had.
 */
export function assertSelf(caller: AuthUser, userId: number) {
  if (caller.id !== userId) {
    throw new ForbiddenException('Bu hesaba erişim yetkiniz yok');
  }
}
