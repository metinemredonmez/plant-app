import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BillingModule } from '../billing/billing.module.js';
import { CareModule } from '../care/care.module.js';
import type { Env } from '../config/env.js';
import { ConsentsModule } from '../consents/consents.module.js';
import { WeatherModule } from '../weather/weather.module.js';
import { AnthropicCareAssistant } from './anthropic.care-assistant.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { CareAssistant } from './care-assistant.js';
import { FakeCareAssistant } from './fake.care-assistant.js';

// env.ts guarantees the API key exists and forbids `fake` in production.
@Module({
  imports: [BillingModule, CareModule, ConsentsModule, WeatherModule],
  controllers: [AssistantController],
  providers: [
    {
      provide: CareAssistant,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('ASSISTANT_DRIVER', { infer: true }) === 'anthropic'
          ? new AnthropicCareAssistant(
              config.get('ANTHROPIC_API_KEY', { infer: true })!,
              config.get('ASSISTANT_MODEL', { infer: true }),
            )
          : new FakeCareAssistant(),
    },
    AssistantService,
  ],
  exports: [CareAssistant],
})
export class AssistantModule {}
