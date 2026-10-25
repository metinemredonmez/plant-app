import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module.js';
import type { Env } from '../config/env.js';
import { OtpModule } from '../otp/otp.module.js';
import { AppleRevocationsService } from './apple-revocations.service.js';
import { AppleSiwa } from './apple-siwa.js';
import { IdTokenVerifier } from './id-tokens.js';
import {
  AppConfigController,
  IdentityController,
  OnboardingController,
} from './identity.controller.js';
import { IdentityService } from './identity.service.js';
import { SecretBox } from './secret-box.js';

@Module({
  imports: [AuthModule, OtpModule],
  controllers: [IdentityController, AppConfigController, OnboardingController],
  providers: [
    IdentityService,
    AppleRevocationsService,
    {
      provide: IdTokenVerifier,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new IdTokenVerifier({
          appleAuthUrl: config.get('APPLE_AUTH_URL', { infer: true }),
          appleAudience: config.get('APPLE_BUNDLE_ID', { infer: true }),
          googleJwksUrl: config.get('GOOGLE_JWKS_URL', { infer: true }),
          googleAudiences: [
            config.get('GOOGLE_WEB_CLIENT_ID', { infer: true }),
            config.get('GOOGLE_IOS_CLIENT_ID', { infer: true }),
          ].filter((id): id is string => !!id),
        }),
    },
    {
      provide: AppleSiwa,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new AppleSiwa({
          authUrl: config.get('APPLE_AUTH_URL', { infer: true }),
          clientId: config.get('APPLE_BUNDLE_ID', { infer: true }),
          teamId: config.get('APPLE_TEAM_ID', { infer: true }),
          keyId: config.get('APPLE_KEY_ID', { infer: true }),
          privateKey: config.get('APPLE_PRIVATE_KEY', { infer: true }),
        }),
    },
    {
      // null without a key: nothing to seal, revocations cannot be queued.
      provide: SecretBox,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const key = config.get('TOKEN_ENCRYPTION_KEY', { infer: true });
        return key ? new SecretBox(key) : null;
      },
    },
  ],
  exports: [AppleRevocationsService],
})
export class IdentityModule {}
