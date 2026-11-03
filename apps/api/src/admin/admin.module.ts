import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BillingModule } from '../billing/billing.module.js';
import type { Env } from '../config/env.js';
import { LegalModule } from '../legal/legal.module.js';
import { PrivacyModule } from '../privacy/privacy.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AnthropicCardDrafter } from './anthropic.card-drafter.js';
import { AuditModule } from './audit.module.js';
import { CardDrafter } from './card-drafter.js';
import { FakeCardDrafter } from './fake.card-drafter.js';
import { SpeciesAdminService } from './species-admin.service.js';

@Module({
  imports: [
    AuditModule,
    BillingModule,
    LegalModule,
    PrivacyModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    SpeciesAdminService,
    {
      // Same switch as the assistant: env.ts requires the key for anthropic.
      provide: CardDrafter,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('ASSISTANT_DRIVER', { infer: true }) === 'anthropic'
          ? new AnthropicCardDrafter(
              config.get('ANTHROPIC_API_KEY', { infer: true })!,
              config.get('CARD_DRAFT_MODEL', { infer: true }),
            )
          : new FakeCardDrafter(),
    },
  ],
})
export class AdminModule {}
