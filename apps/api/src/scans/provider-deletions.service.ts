import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VisionProvider, VisionProviderError } from './vision-provider.js';

const MAX_ATTEMPTS = 12;
const RETRY_EVERY_MS = 15 * 60_000;
/** 1, 2, 4 … hours, at most two days between tries. */
const backoffMs = (attempts: number) =>
  Math.min(2 ** (attempts - 1), 48) * 3_600_000;

/**
 * The vision provider's copy of a scan is deleted as soon as the result is
 * here, so a later account deletion has nothing to chase there. A delete
 * that fails is retried with backoff; the queue holds no link to a person,
 * and the scan itself never waits for it.
 */
@Injectable()
export class ProviderDeletionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderDeletionsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vision: VisionProvider,
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

  /** Right after a provider call. Never fails the scan. */
  async forget(providerRef: string | undefined) {
    if (!providerRef) return;
    try {
      await this.vision.forget(providerRef);
    } catch (error) {
      if (!(error instanceof VisionProviderError)) throw error;
      this.logger.warn(`provider deletion queued: ${error.message}`);
      await this.prisma.providerDeletion.create({
        data: {
          provider: this.vision.name,
          ref: providerRef,
          nextAttemptAt: new Date(Date.now() + backoffMs(1)),
          lastError: error.message,
        },
      });
    }
  }

  /** Retries due deletions; done ones go, and hopeless ones are logged. */
  async runDue() {
    const due = await this.prisma.providerDeletion.findMany({
      where: {
        provider: this.vision.name,
        nextAttemptAt: { lte: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      take: 100,
    });
    for (const row of due) {
      try {
        await this.vision.forget(row.ref);
        await this.prisma.providerDeletion.delete({ where: { id: row.id } });
      } catch (error) {
        if (!(error instanceof VisionProviderError)) throw error;
        const attempts = row.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          this.logger.error(
            `provider deletion gave up after ${attempts} tries`,
          );
        }
        await this.prisma.providerDeletion.update({
          where: { id: row.id },
          data: {
            attempts,
            nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
            lastError: error.message,
          },
        });
      }
    }
  }
}
