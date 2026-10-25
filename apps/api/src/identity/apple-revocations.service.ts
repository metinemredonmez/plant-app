import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppleSiwa } from './apple-siwa.js';
import { SecretBox } from './secret-box.js';

const MAX_ATTEMPTS = 12;
const RETRY_EVERY_MS = 15 * 60_000;
/** 1, 2, 4 … hours, at most two days between tries. */
const backoffMs = (attempts: number) =>
  Math.min(2 ** (attempts - 1), 48) * 3_600_000;

/**
 * Revokes Sign in with Apple access of deleted accounts. A revocation that
 * fails (Apple down, key missing) is kept, sealed, and retried with backoff;
 * the account deletion itself never waits for or depends on Apple.
 */
@Injectable()
export class AppleRevocationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppleRevocationsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apple: AppleSiwa,
    @Inject(SecretBox) private readonly box: SecretBox | null,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    this.timer = setInterval(() => void this.runDue(), RETRY_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** At account deletion: revoke now, queue what Apple did not take. */
  async revokeOrQueue(sealedTokens: string[]) {
    for (const sealed of sealedTokens) {
      const result = await this.revokeSealed(sealed);
      if (!result.ok) {
        this.logger.warn(`Apple revocation queued: ${result.error}`);
        await this.prisma.appleRevocation.create({
          data: {
            refreshToken: sealed,
            attempts: 1,
            nextAttemptAt: new Date(Date.now() + backoffMs(1)),
            lastError: result.error,
          },
        });
      }
    }
  }

  /** Retries due revocations; done ones are deleted. */
  async runDue() {
    const due = await this.prisma.appleRevocation.findMany({
      where: {
        nextAttemptAt: { lte: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      take: 50,
    });
    for (const row of due) {
      const result = await this.revokeSealed(row.refreshToken);
      if (result.ok) {
        await this.prisma.appleRevocation.delete({ where: { id: row.id } });
        continue;
      }
      const attempts = row.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        this.logger.error(
          `Apple revocation ${row.id} gave up after ${attempts} tries`,
        );
      }
      await this.prisma.appleRevocation.update({
        where: { id: row.id },
        data: {
          attempts,
          nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
          lastError: result.error,
        },
      });
    }
    return due.length;
  }

  private async revokeSealed(sealed: string) {
    if (!this.box) return { ok: false, error: 'TOKEN_ENCRYPTION_KEY missing' };
    try {
      return await this.apple.revoke(this.box.open(sealed));
    } catch (error) {
      return { ok: false, error: `cannot open: ${String(error)}` };
    }
  }
}
