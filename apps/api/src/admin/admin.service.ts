import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { isActive } from '../billing/entitlements.service.js';
import { UsageService } from '../billing/usage.service.js';
import type { Env } from '../config/env.js';
import { AiUsageService } from '../costs/ai-usage.service.js';
import { CLAUDE_PRICES } from '../costs/prices.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { AuditService } from './audit.service.js';

export const resolveSchema = z.object({
  resolution: z.string().trim().min(2).max(300),
});

/** Placeholder addresses of accounts opened with Apple, Google or phone. */
const NO_EMAIL = '@users.everbloom.invalid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const shownEmail = (email: string) => (email.endsWith(NO_EMAIL) ? null : email);

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly users: UsersService,
    private readonly usage: UsageService,
    private readonly aiUsage: AiUsageService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async overview() {
    const [drafts, openReports, users, premium, todayUsd] = await Promise.all([
      this.prisma.plantSpecies.count({ where: { status: 'DRAFT' } }),
      this.prisma.chatMessage.count({
        where: { reportedAt: { not: null }, reportResolvedAt: null },
      }),
      this.prisma.user.count({
        where: { anonymizedAt: null, role: 'CUSTOMER' },
      }),
      this.prisma.entitlement.count({ where: { status: { not: 'EXPIRED' } } }),
      this.aiUsage.today(),
    ]);
    return {
      drafts,
      openReports,
      users,
      premium,
      todayUsd,
      limitUsd: this.config.get('DAILY_SPEND_ALERT_USD', { infer: true }),
    };
  }

  /** "Bu yanıtı bildir" queue, with the question that was answered. */
  async reports(state: 'open' | 'closed') {
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        reportedAt: { not: null },
        reportResolvedAt: state === 'open' ? null : { not: null },
      },
      orderBy: { reportedAt: state === 'open' ? 'asc' : 'desc' },
      take: 100,
      include: {
        user: { select: { publicId: true } },
        userPlant: { select: { nickname: true } },
      },
    });
    return Promise.all(
      rows.map(async (row) => {
        const question = await this.prisma.chatMessage.findFirst({
          where: {
            userId: row.userId,
            userPlantId: row.userPlantId,
            role: 'USER',
            id: { lt: row.id },
          },
          orderBy: { id: 'desc' },
          select: { content: true },
        });
        return {
          id: row.id,
          question: question?.content ?? null,
          answer: row.content,
          reason: row.reportReason,
          note: row.reportNote,
          reportedAt: row.reportedAt,
          resolution: row.reportResolution,
          resolvedAt: row.reportResolvedAt,
          user: row.user.publicId,
          plant: row.userPlant?.nickname ?? null,
        };
      }),
    );
  }

  async resolveReport(actor: AuthUser, id: number, resolution: string) {
    const report = await this.prisma.chatMessage.findFirst({
      where: { id, reportedAt: { not: null } },
      select: { id: true },
    });
    if (!report) throw new NotFoundException('Bildirim bulunamadı');
    const done = await this.prisma.chatMessage.update({
      where: { id },
      data: { reportResolution: resolution, reportResolvedAt: new Date() },
      select: { id: true, reportResolution: true, reportResolvedAt: true },
    });
    await this.audit.log(
      actor,
      'report.resolve',
      { type: 'chat_message', id },
      {
        resolution,
      },
    );
    return done;
  }

  /** By e-mail or public id; phone numbers are only stored as a hash. */
  async findUsers(q?: string) {
    const term = q?.trim();
    const rows = await this.prisma.user.findMany({
      where: term
        ? {
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              { name: { contains: term, mode: 'insensitive' } },
              // A uuid column: anything else would be a database error.
              ...(UUID.test(term) ? [{ publicId: term }] : []),
            ],
          }
        : {},
      orderBy: { id: 'desc' },
      take: 50,
      include: { entitlement: true },
    });
    return rows.map((user) => ({
      id: user.id,
      publicId: user.publicId,
      name: user.name,
      email: shownEmail(user.email),
      role: user.role,
      signInMethod: user.lastSignInMethod,
      premium: isActive(user.entitlement),
      createdAt: user.createdAt,
      anonymizedAt: user.anonymizedAt,
    }));
  }

  async user(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { entitlement: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const [usage, plants, scans, messages, consents] = await Promise.all([
      this.usage.summary(id),
      this.prisma.userPlant.count({ where: { userId: id, archivedAt: null } }),
      this.prisma.scan.count({ where: { userId: id } }),
      this.prisma.chatMessage.count({ where: { userId: id, role: 'USER' } }),
      this.prisma.consent.findMany({
        where: { userId: id },
        orderBy: { id: 'desc' },
        take: 10,
        select: {
          kind: true,
          granted: true,
          textVersion: true,
          createdAt: true,
        },
      }),
    ]);
    const entitlement = user.entitlement;
    return {
      id: user.id,
      publicId: user.publicId,
      name: user.name,
      email: shownEmail(user.email),
      role: user.role,
      city: user.city,
      signInMethod: user.lastSignInMethod,
      createdAt: user.createdAt,
      anonymizedAt: user.anonymizedAt,
      // Read only: the store and RevenueCat are the source of truth.
      subscription: entitlement && {
        active: isActive(entitlement),
        status: entitlement.status,
        productId: entitlement.productId,
        store: entitlement.store,
        sandbox: entitlement.sandbox,
        expiresAt: entitlement.expiresAt,
        willRenew: entitlement.willRenew,
      },
      used: usage.used,
      limits: usage.limits,
      counts: { plants, scans, messages },
      consents,
    };
  }

  async anonymize(actor: AuthUser, id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, anonymizedAt: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (user.role !== 'CUSTOMER' || id === actor.id) {
      throw new UnprocessableEntityException(
        'Yönetici ve ekip hesapları buradan anonimleştirilemez',
      );
    }
    if (user.anonymizedAt) {
      throw new UnprocessableEntityException('Hesap zaten anonimleştirilmiş');
    }
    await this.users.anonymize(id);
    await this.audit.log(actor, 'user.anonymize', { type: 'user', id });
    return { id, anonymized: true };
  }

  async costs(days: number) {
    const span = Math.min(Math.max(days, 1), 90);
    return {
      todayUsd: await this.aiUsage.today(),
      limitUsd: this.config.get('DAILY_SPEND_ALERT_USD', { infer: true }),
      days: await this.aiUsage.daily(span),
      prices: {
        claude: CLAUDE_PRICES,
        kindwisePerCall: this.config.get('KINDWISE_USD_PER_CALL', {
          infer: true,
        }),
      },
    };
  }
}
