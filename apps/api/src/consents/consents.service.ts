import { ForbiddenException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AI_DOC, LegalService, TRAINING_DOC } from '../legal/legal.service.js';

/** Photos and questions go to third-party AI providers abroad. */
export const AI_PROCESSING = 'AI_PROCESSING';
/** Scan photos may improve the models; separate and off by default. */
export const MODEL_TRAINING = 'MODEL_TRAINING';

const DOCS = { [AI_PROCESSING]: AI_DOC, [MODEL_TRAINING]: TRAINING_DOC };

export const consentSchema = z.object({
  kind: z.enum([AI_PROCESSING, MODEL_TRAINING]),
  granted: z.boolean(),
  textVersion: z.string().min(1).max(40),
});
export type ConsentBody = z.output<typeof consentSchema>;

/**
 * Explicit, versioned consent before any photo or question is sent to an AI
 * provider (Apple 5.1.2(i), KVKK cross-border transfer). Append-only: the
 * latest row wins, so withdrawals are kept as history too. A consent counts
 * only for the current version of its text (ADR 0016).
 */
@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legal: LegalService,
  ) {}

  private async statusOf(caller: AuthUser, kind: keyof typeof DOCS) {
    const [latest, doc] = await Promise.all([
      this.prisma.consent.findFirst({
        where: { userId: caller.id, kind },
        orderBy: { id: 'desc' },
      }),
      this.legal.current(DOCS[kind]),
    ]);
    return {
      kind,
      currentVersion: doc.version,
      granted: !!latest?.granted && latest.textVersion === doc.version,
      grantedVersion: latest?.granted ? latest.textVersion : null,
    };
  }

  status(caller: AuthUser) {
    return this.statusOf(caller, AI_PROCESSING);
  }

  modelTraining(caller: AuthUser) {
    return this.statusOf(caller, MODEL_TRAINING);
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
    return this.statusOf(caller, body.kind);
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
