import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { type EntitlementStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** The entitlement identifier configured in the RevenueCat dashboard. */
export const PREMIUM = 'premium';

const ms = z.number().int().nullish();
export const revenueCatEventSchema = z.looseObject({
  api_version: z.string().optional(),
  event: z.looseObject({
    id: z.string().min(1),
    type: z.string().min(1),
    app_user_id: z.string().nullish(),
    original_app_user_id: z.string().nullish(),
    aliases: z.array(z.string()).nullish(),
    product_id: z.string().nullish(),
    entitlement_ids: z.array(z.string()).nullish(),
    event_timestamp_ms: z.number().int(),
    expiration_at_ms: ms,
    grace_period_expiration_at_ms: ms,
    environment: z.string().nullish(),
    store: z.string().nullish(),
    transferred_from: z.array(z.string()).nullish(),
    transferred_to: z.array(z.string()).nullish(),
  }),
});
export type RevenueCatWebhook = z.output<typeof revenueCatEventSchema>;
type RcEvent = RevenueCatWebhook['event'];

type Outcome = 'applied' | 'ignored_old' | 'unknown_user' | 'skipped';

const ACTIVE_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'NON_RENEWING_PURCHASE',
  'REFUND_REVERSED',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RevenueCat webhooks → our entitlement table. Every event is stored once
 * (idempotent by event id) with what we did. Out-of-order events older than
 * the last applied one are ignored. The app identifies users to RevenueCat
 * with `User.publicId`, never the row id.
 */
@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(
    body: RevenueCatWebhook,
  ): Promise<{ outcome: Outcome | 'duplicate' }> {
    const event = body.event;
    const seen = await this.prisma.billingEvent.findUnique({
      where: {
        provider_eventId: { provider: 'revenuecat', eventId: event.id },
      },
    });
    if (seen) return { outcome: 'duplicate' };

    const outcome = await this.prisma.$transaction((tx) =>
      this.apply(tx, event),
    );
    try {
      await this.prisma.billingEvent.create({
        data: {
          provider: 'revenuecat',
          eventId: event.id,
          type: event.type,
          appUserId: event.app_user_id ?? null,
          outcome,
          payload: body as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // A concurrent delivery of the same event already recorded it.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }
    if (outcome === 'unknown_user') {
      this.logger.warn(`event ${event.id} (${event.type}) for an unknown user`);
    }
    return { outcome };
  }

  private async userFor(
    tx: Prisma.TransactionClient,
    ids: (string | null | undefined)[],
  ) {
    const candidates = ids.filter((id): id is string => !!id && UUID.test(id));
    if (!candidates.length) return null;
    return tx.user.findFirst({ where: { publicId: { in: candidates } } });
  }

  private async apply(
    tx: Prisma.TransactionClient,
    event: RcEvent,
  ): Promise<Outcome> {
    if (event.type === 'TEST') return 'skipped';
    if (event.type === 'TRANSFER') return this.transfer(tx, event);
    if (event.entitlement_ids && !event.entitlement_ids.includes(PREMIUM)) {
      return 'skipped';
    }

    const user = await this.userFor(tx, [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
    ]);
    if (!user) return 'unknown_user';

    const at = new Date(event.event_timestamp_ms);
    const current = await tx.entitlement.findUnique({
      where: { userId: user.id },
    });
    if (current && current.lastEventAt > at) return 'ignored_old';

    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : null;
    let status: EntitlementStatus;
    let willRenew = true;
    let until = expiresAt;
    if (ACTIVE_TYPES.has(event.type)) {
      status = 'ACTIVE';
      willRenew = event.type !== 'NON_RENEWING_PURCHASE';
    } else if (
      event.type === 'CANCELLATION' ||
      event.type === 'SUBSCRIPTION_PAUSED'
    ) {
      // Access runs to the end of the paid period (a refund moves it to now).
      status = 'ACTIVE';
      willRenew = false;
    } else if (event.type === 'BILLING_ISSUE') {
      status = 'GRACE';
      until = event.grace_period_expiration_at_ms
        ? new Date(event.grace_period_expiration_at_ms)
        : expiresAt;
    } else if (event.type === 'EXPIRATION') {
      status = 'EXPIRED';
      willRenew = false;
    } else {
      return 'skipped';
    }

    const data = {
      status,
      productId: event.product_id ?? current?.productId ?? 'unknown',
      store: event.store ?? current?.store ?? 'unknown',
      sandbox: event.environment === 'SANDBOX',
      expiresAt: until,
      willRenew,
      lastEventAt: at,
    };
    await tx.entitlement.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
    return 'applied';
  }

  /** Restored on another account: access moves with the purchase. */
  private async transfer(
    tx: Prisma.TransactionClient,
    event: RcEvent,
  ): Promise<Outcome> {
    const from = await this.userFor(tx, event.transferred_from ?? []);
    const to = await this.userFor(tx, event.transferred_to ?? []);
    if (!from && !to) return 'unknown_user';
    const at = new Date(event.event_timestamp_ms);
    const source = from
      ? await tx.entitlement.findUnique({ where: { userId: from.id } })
      : null;
    if (from && source) {
      await tx.entitlement.update({
        where: { userId: from.id },
        data: { status: 'EXPIRED', willRenew: false, lastEventAt: at },
      });
    }
    if (to && source) {
      const {
        id: _id,
        userId: _userId,
        updatedAt: _updatedAt,
        ...copy
      } = source;
      await tx.entitlement.upsert({
        where: { userId: to.id },
        create: { ...copy, userId: to.id, lastEventAt: at },
        update: { ...copy, lastEventAt: at },
      });
    }
    return 'applied';
  }
}
