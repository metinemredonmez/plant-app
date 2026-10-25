import { Injectable } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.decorators.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Every admin write leaves one entry (plan, week 8). Entries are never edited. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actor: AuthUser,
    action: string,
    target: { type: string; id: string | number },
    details?: Prisma.InputJsonValue,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { email: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: user.email,
        action,
        targetType: target.type,
        targetId: String(target.id),
        details,
      },
    });
  }

  list(take = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { id: 'desc' },
      take: Math.min(Math.max(take, 1), 500),
    });
  }
}
