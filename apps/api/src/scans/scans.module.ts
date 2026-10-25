import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BillingModule } from '../billing/billing.module.js';
import { CareModule } from '../care/care.module.js';
import type { Env } from '../config/env.js';
import { ConsentsModule } from '../consents/consents.module.js';
import { FakeVisionProvider } from './fake.vision-provider.js';
import { KindwiseVisionProvider } from './kindwise.vision-provider.js';
import { ScansController } from './scans.controller.js';
import { ScansService } from './scans.service.js';
import { VisionProvider } from './vision-provider.js';

// env.ts guarantees the Kindwise key exists and forbids `fake` in production.
@Module({
  imports: [BillingModule, CareModule, ConsentsModule],
  controllers: [ScansController],
  providers: [
    {
      provide: VisionProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('VISION_DRIVER', { infer: true }) === 'kindwise'
          ? new KindwiseVisionProvider({
              apiKey: config.get('KINDWISE_API_KEY', { infer: true })!,
            })
          : new FakeVisionProvider(),
    },
    ScansService,
  ],
  exports: [VisionProvider],
})
export class ScansModule {}
