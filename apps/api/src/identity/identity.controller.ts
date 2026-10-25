import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import {
  type AuthUser,
  AuthRateLimited,
  CurrentUser,
  Public,
} from '../auth/auth.decorators.js';
import { type CareProfileBody, careProfileSchema } from '../care/profile.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdentityService } from './identity.service.js';

const appleSchema = z.object({
  identityToken: z.string().min(20).max(5000),
  // The raw nonce; Apple's token carries its SHA-256.
  nonce: z.string().min(16).max(128),
  authorizationCode: z.string().min(1).max(500).optional(),
  fullName: z.string().trim().max(80).optional(),
});
const googleSchema = z.object({ idToken: z.string().min(20).max(5000) });
const phoneSchema = z.object({ phone: z.string().trim().min(7).max(32) });
const phoneVerifySchema = phoneSchema.extend({
  code: z.string().regex(/^\d{6}$/, 'Kod 6 haneli olmalı'),
});

@Public()
@Controller('v1/auth')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @AuthRateLimited()
  @Post('apple')
  @HttpCode(200)
  apple(@Body(new ZodBody(appleSchema)) body: z.output<typeof appleSchema>) {
    return this.identity.withApple(body);
  }

  @AuthRateLimited()
  @Post('google')
  @HttpCode(200)
  google(@Body(new ZodBody(googleSchema)) body: z.output<typeof googleSchema>) {
    return this.identity.withGoogle(body);
  }

  @AuthRateLimited()
  @Post('phone/code')
  @HttpCode(200)
  phoneCode(
    @Body(new ZodBody(phoneSchema)) body: z.output<typeof phoneSchema>,
  ) {
    return this.identity.sendPhoneCode(body);
  }

  @AuthRateLimited()
  @Post('phone/verify')
  @HttpCode(200)
  phoneVerify(
    @Body(new ZodBody(phoneVerifySchema))
    body: z.output<typeof phoneVerifySchema>,
  ) {
    return this.identity.verifyPhoneCode(body);
  }
}

/** What the app needs before anyone signs in. */
@Public()
@Controller('v1')
export class AppConfigController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  @Get('app-config')
  appConfig() {
    const get = <K extends keyof Env>(key: K) =>
      this.config.get(key, { infer: true });
    return {
      minAppVersion: get('MIN_APP_VERSION'),
      auth: {
        email: true,
        apple: get('AUTH_APPLE_ENABLED'),
        // Public OAuth client ids: the app configures Google Sign-In with them.
        google: get('AUTH_GOOGLE_ENABLED')
          ? {
              webClientId: get('GOOGLE_WEB_CLIENT_ID'),
              iosClientId: get('GOOGLE_IOS_CLIENT_ID'),
            }
          : null,
        phone: get('AUTH_PHONE_ENABLED'),
      },
      paywallOnboarding: get('PAYWALL_ONBOARDING'),
    };
  }
}

/** The steps GET /v1/me lists under `missingSteps`. */
@Controller('v1/me')
export class OnboardingController {
  constructor(private readonly prisma: PrismaService) {}

  /** The first questions, or "Geç" on all of them: either way, asked. */
  @Put('care-profile')
  async careProfile(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(careProfileSchema)) body: CareProfileBody,
  ) {
    const { city, ...profile } = body;
    const user = await this.prisma.user.update({
      where: { id: caller.id },
      data: {
        careProfile: profile,
        careProfileAt: new Date(),
        ...(city === undefined ? {} : { city }),
      },
      select: { careProfile: true, city: true },
    });
    return user;
  }

  /** The onboarding paywall was on screen; it is not offered again. */
  @Post('paywall-offered')
  @HttpCode(200)
  async paywallOffered(@CurrentUser() caller: AuthUser) {
    await this.prisma.user.updateMany({
      where: { id: caller.id, paywallOfferedAt: null },
      data: { paywallOfferedAt: new Date() },
    });
    return { message: 'Kaydedildi' };
  }
}
