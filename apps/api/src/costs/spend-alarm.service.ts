import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { istanbulDate } from '../care/season.js';
import type { Env } from '../config/env.js';
import { EmailSender } from '../messaging/senders.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiUsageService } from './ai-usage.service.js';

/**
 * Daily spend alarm (plan, week 8): when today's estimated AI spend passes
 * DAILY_SPEND_ALERT_USD, one e-mail to ADMIN_ALERT_EMAIL. The unique day
 * row makes it once per day even with several API instances.
 */
@Injectable()
export class SpendAlarmService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SpendAlarmService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: AiUsageService,
    private readonly email: EmailSender,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    const minutes = this.config.get('SPEND_CHECK_MINUTES', { infer: true });
    if (minutes > 0 && this.recipients().length) {
      this.timer = setInterval(() => void this.check(), minutes * 60_000);
      this.timer.unref();
    }
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  private recipients() {
    return (this.config.get('ADMIN_ALERT_EMAIL', { infer: true }) ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
  }

  /** True when an alarm went out on this call. */
  async check(now = new Date()) {
    const to = this.recipients();
    const limit = this.config.get('DAILY_SPEND_ALERT_USD', { infer: true });
    if (!to.length) return false;
    const total = await this.usage.today();
    if (total < limit) return false;
    const day = istanbulDate(now);
    try {
      await this.prisma.spendAlert.create({ data: { day, totalUsd: total } });
    } catch {
      return false; // already sent today
    }
    const text = [
      `Bugünkü tahmini yapay zekâ harcaması ${total.toFixed(2)} dolar; eşik ${limit.toFixed(2)} dolar.`,
      'Ayrıntı admin panelinde, Maliyet sayfasında. Kotaları düşürmek ya da bir sağlayıcıyı kapatmak için sunucu ayarlarına bakın.',
      'Tutarlar liste fiyatıyla tahmindir; fatura esastır.',
    ].join('\n\n');
    for (const address of to) {
      await this.email
        .send({
          to: address,
          subject: `EverBloom: günlük harcama eşiği aşıldı (${day})`,
          text,
        })
        .catch((error: unknown) =>
          this.logger.error(`spend alarm to ${address}: ${String(error)}`),
        );
    }
    this.logger.warn(`spend alarm sent: ${total.toFixed(2)} USD on ${day}`);
    return true;
  }
}
