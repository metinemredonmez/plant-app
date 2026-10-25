import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Photos and questions go to third-party AI providers abroad. */
export const AI_PROCESSING = 'AI_PROCESSING';

export const consentSchema = z.object({
  kind: z.literal(AI_PROCESSING),
  granted: z.boolean(),
  textVersion: z.string().min(1).max(40),
});
export type ConsentBody = z.output<typeof consentSchema>;

/**
 * Explicit, versioned consent before any photo or question is sent to an AI
 * provider (Apple 5.1.2(i), KVKK cross-border transfer). Append-only: the
 * latest row wins, so withdrawals are kept as history too.
 */
@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get version() {
    return this.config.get('AI_CONSENT_VERSION', { infer: true });
  }

  async status(caller: AuthUser) {
    const latest = await this.prisma.consent.findFirst({
      where: { userId: caller.id, kind: AI_PROCESSING },
      orderBy: { id: 'desc' },
    });
    return {
      kind: AI_PROCESSING,
      currentVersion: this.version,
      granted: !!latest?.granted && latest.textVersion === this.version,
      grantedVersion: latest?.granted ? latest.textVersion : null,
    };
  }

  async record(caller: AuthUser, body: ConsentBody) {
    await this.prisma.consent.create({
      data: {
        userId: caller.id,
        kind: body.kind,
        granted: body.granted,
        textVersion: body.textVersion,
      },
    });
    return this.status(caller);
  }

  async assertAiConsent(caller: AuthUser) {
    if (!(await this.status(caller)).granted) {
      throw new ForbiddenException({
        message:
          'Fotoğraf ve sorularınızın yapay zekâ ile işlenmesi için onayınız gerekiyor',
        code: 'consent_required',
      });
    }
  }
}
