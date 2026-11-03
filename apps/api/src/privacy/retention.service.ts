import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DAY_MS } from '../care/season.js';
import type { Env } from '../config/env.js';
import { EmailSender } from '../messaging/senders.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImageStorage } from '../storage/image-storage.js';

const JOB = 'retention';
const BATCH = 200;
/** Checked hourly; a restart must not run it again the same day. */
const RUN_EVERY_MS = 23 * 60 * 60 * 1000;
/** Warn the owner this long before a KVKK answer is due. */
const REMIND_BEFORE_MS = 5 * DAY_MS;
// Not personal once expired, but no reason to keep them.
const OTP_KEEP_MS = 7 * DAY_MS;
const SESSION_KEEP_MS = 30 * DAY_MS;

/**
 * Saklama kuralları (ADR 0016). Scheduled here, last run kept in the database
 * so the admin panel can show it. An open report keeps its chat message until
 * someone has looked at it.
 */
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorage,
    private readonly email: EmailSender,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    const hours = this.config.get('RETENTION_CHECK_HOURS', { infer: true });
    if (hours > 0 && this.config.get('NODE_ENV', { infer: true }) !== 'test') {
      this.timer = setInterval(() => void this.tick(), hours * 3_600_000);
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private days(key: keyof Env & `RETENTION_${string}_DAYS`, now: Date) {
    const days = this.config.get(key, { infer: true }) as number;
    return new Date(now.getTime() - days * DAY_MS);
  }

  /** Runs when a day has passed since the last run. */
  async tick(now = new Date()) {
    const last = await this.prisma.jobRun.findUnique({ where: { name: JOB } });
    if (last && now.getTime() - last.lastRunAt.getTime() < RUN_EVERY_MS) {
      return null;
    }
    try {
      return await this.run(now);
    } catch (error) {
      // Not marked as run: tried again at the next check.
      this.logger.error(`retention failed: ${String(error)}`);
      return null;
    }
  }

  async run(now = new Date()) {
    const result = {
      photos: await this.removePhotos(now),
      chats: (
        await this.prisma.chatMessage.deleteMany({
          where: {
            createdAt: { lt: this.days('RETENTION_CHAT_DAYS', now) },
            NOT: { reportedAt: { not: null }, reportResolvedAt: null },
          },
        })
      ).count,
      codes: (
        await this.prisma.otpCode.deleteMany({
          where: { expiresAt: { lt: new Date(now.getTime() - OTP_KEEP_MS) } },
        })
      ).count,
      sessions: (
        await this.prisma.refreshToken.deleteMany({
          where: {
            expiresAt: { lt: new Date(now.getTime() - SESSION_KEEP_MS) },
          },
        })
      ).count,
      usageDetached: (
        await this.prisma.aiUsage.updateMany({
          where: {
            userId: { not: null },
            createdAt: { lt: this.days('RETENTION_USAGE_DAYS', now) },
          },
          data: { userId: null },
        })
      ).count,
      requests: (
        await this.prisma.privacyRequest.deleteMany({
          where: {
            status: { not: 'OPEN' },
            createdAt: { lt: this.days('RETENTION_REQUEST_DAYS', now) },
          },
        })
      ).count,
      audit: (
        await this.prisma.auditLog.deleteMany({
          where: { createdAt: { lt: this.days('RETENTION_AUDIT_DAYS', now) } },
        })
      ).count,
      reminders: await this.remindDueRequests(now),
    };
    await this.prisma.jobRun.upsert({
      where: { name: JOB },
      create: { name: JOB, lastRunAt: now, result },
      update: { lastRunAt: now, result },
    });
    this.logger.log(`retention: ${JSON.stringify(result)}`);
    return result;
  }

  /** The photo goes; the scan's result stays with the plant's history. */
  private async removePhotos(now: Date) {
    const cutoff = this.days('RETENTION_PHOTO_DAYS', now);
    let removed = 0;
    for (;;) {
      const scans = await this.prisma.scan.findMany({
        where: { imageKey: { not: null }, createdAt: { lt: cutoff } },
        select: { id: true, imageKey: true },
        take: BATCH,
      });
      if (!scans.length) return removed;
      await this.storage.remove(scans.map((scan) => scan.imageKey!));
      await this.prisma.scan.updateMany({
        where: { id: { in: scans.map((scan) => scan.id) } },
        data: { imageKey: null },
      });
      removed += scans.length;
    }
  }

  /** KVKK m.13: 30 days. One reminder per request, near the deadline. */
  private async remindDueRequests(now: Date) {
    const to = (this.config.get('ADMIN_ALERT_EMAIL', { infer: true }) ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    const due = await this.prisma.privacyRequest.findMany({
      where: {
        status: 'OPEN',
        reminderSentAt: null,
        dueAt: { lte: new Date(now.getTime() + REMIND_BEFORE_MS) },
      },
      select: { id: true, dueAt: true },
    });
    if (!due.length || !to.length) return 0;
    const lines = due.map(
      (request) =>
        `#${request.id}: son gün ${request.dueAt.toISOString().slice(0, 10)}`,
    );
    for (const address of to) {
      await this.email
        .send({
          to: address,
          subject: `EverBloom: yanıtlanması gereken ${due.length} KVKK başvurusu`,
          text: `Süresi yaklaşan başvurular:\n\n${lines.join('\n')}\n\nAdmin panelinde, KVKK başvuruları sayfasından yanıtlayın.`,
        })
        .catch((error: unknown) =>
          this.logger.error(`KVKK reminder: ${String(error)}`),
        );
    }
    await this.prisma.privacyRequest.updateMany({
      where: { id: { in: due.map((request) => request.id) } },
      data: { reminderSentAt: now },
    });
    return due.length;
  }
}
