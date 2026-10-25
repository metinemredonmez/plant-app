import { timingSafeEqual } from 'node:crypto';

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AuthUser, CurrentUser, Public } from '../auth/auth.decorators.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import type { Env } from '../config/env.js';
import { ConsentsService } from '../consents/consents.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  revenueCatEventSchema,
  RevenueCatService,
  type RevenueCatWebhook,
} from './revenuecat.service.js';
import { UsageService } from './usage.service.js';

const sameSecret = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

@Controller('v1')
export class BillingController {
  constructor(
    private readonly revenueCat: RevenueCatService,
    private readonly usage: UsageService,
    private readonly consents: ConsentsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Configured in RevenueCat with `Authorization: Bearer <secret>`. */
  @Public()
  @Post('billing/revenuecat')
  @HttpCode(200)
  webhook(
    @Headers('authorization') authorization: string | undefined,
    @Body(new ZodBody(revenueCatEventSchema)) body: RevenueCatWebhook,
  ) {
    const secret = this.config.get('REVENUECAT_WEBHOOK_SECRET', {
      infer: true,
    });
    if (!secret) throw new NotFoundException();
    if (!authorization || !sameSecret(authorization, `Bearer ${secret}`)) {
      throw new UnauthorizedException('Geçersiz imza');
    }
    return this.revenueCat.handle(body);
  }

  /** What the app needs on start: who I am, my plan, today's usage. */
  @Get('me')
  async me(@CurrentUser() caller: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: caller.id },
    });
    const [{ premium, entitlement, limits, used }, aiConsent] =
      await Promise.all([
        this.usage.summary(caller.id),
        this.consents.status(caller),
      ]);
    return {
      id: user.id,
      publicId: user.publicId,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      plan: {
        premium,
        status: entitlement?.status ?? null,
        expiresAt: entitlement?.expiresAt ?? null,
        willRenew: entitlement?.willRenew ?? null,
        productId: entitlement?.productId ?? null,
      },
      limits,
      used,
      aiConsent,
    };
  }
}
