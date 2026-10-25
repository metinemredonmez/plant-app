import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import {
  DAY_MS,
  istanbulDayStart,
  istanbulMonthStart,
} from '../care/season.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EntitlementsService } from './entitlements.service.js';

/**
 * Limits on the paid-for work. 402 with `code: quota_exceeded` tells the app
 * to show the paywall. Failed scans, photos without a recognized plant and
 * unanswered questions never use the free quota.
 */
@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async used(userId: number) {
    const done = { userId, status: 'DONE' as const };
    // Photos without a recognized plant count only toward the daily limit.
    const charged = { ...done, chargeable: true };
    const [identifyWeek, diagnosesTotal, scansToday, messagesMonth, plants] =
      await Promise.all([
        this.prisma.scan.count({
          where: {
            ...charged,
            kind: 'IDENTIFY',
            createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) },
          },
        }),
        this.prisma.scan.count({ where: { ...charged, kind: 'DIAGNOSE' } }),
        this.prisma.scan.count({
          where: { ...done, createdAt: { gte: istanbulDayStart() } },
        }),
        this.prisma.chatMessage.count({
          where: {
            userId,
            role: 'USER',
            createdAt: { gte: istanbulMonthStart() },
          },
        }),
        this.prisma.userPlant.count({ where: { userId, archivedAt: null } }),
      ]);
    return { identifyWeek, diagnosesTotal, scansToday, messagesMonth, plants };
  }

  async summary(userId: number) {
    const [{ premium, entitlement, limits }, used] = await Promise.all([
      this.entitlements.forUser(userId),
      this.used(userId),
    ]);
    return { premium, entitlement, limits, used };
  }

  async assertCanIdentify(userId: number) {
    const { limits, used } = await this.summary(userId);
    if (
      limits.identifyPerWeek !== null &&
      used.identifyWeek >= limits.identifyPerWeek
    ) {
      throw quotaExceeded(
        `Ücretsiz planda haftada ${limits.identifyPerWeek} tanıma yapılabilir`,
      );
    }
    this.assertDaily(limits.scansPerDay, used.scansToday);
  }

  async assertCanDiagnose(userId: number) {
    const { limits, used } = await this.summary(userId);
    if (
      limits.diagnosesTotal !== null &&
      used.diagnosesTotal >= limits.diagnosesTotal
    ) {
      throw quotaExceeded(
        'Ücretsiz deneme teşhisinizi kullandınız; teşhis ve iyileşme takibi premium planda',
      );
    }
    this.assertDaily(limits.scansPerDay, used.scansToday);
  }

  /**
   * A second photo or follow-up belongs to a diagnosis already counted: only
   * fair use applies (ScansService caps how many one diagnosis gets).
   */
  async assertCanLinkScan(userId: number) {
    const { limits, used } = await this.summary(userId);
    this.assertDaily(limits.scansPerDay, used.scansToday);
  }

  async assertCanAsk(userId: number) {
    const { premium, limits, used } = await this.summary(userId);
    if (used.messagesMonth >= limits.messagesPerMonth) {
      throw quotaExceeded(
        premium
          ? 'Bu ayki soru sınırına ulaştınız'
          : `Ücretsiz planda ayda ${limits.messagesPerMonth} soru sorulabilir`,
      );
    }
  }

  async assertCanAddPlant(userId: number) {
    const { limits, used } = await this.summary(userId);
    if (limits.plants !== null && used.plants >= limits.plants) {
      throw quotaExceeded(
        `Ücretsiz planda en fazla ${limits.plants} bitki eklenebilir`,
      );
    }
  }

  private assertDaily(scansPerDay: number | null, scansToday: number) {
    if (scansPerDay !== null && scansToday >= scansPerDay) {
      throw quotaExceeded(
        'Bugünlük tarama sınırına ulaştınız, yarın tekrar deneyin',
      );
    }
  }
}

const quotaExceeded = (message: string) =>
  new HttpException(
    { message, code: 'quota_exceeded' },
    HttpStatus.PAYMENT_REQUIRED,
  );
