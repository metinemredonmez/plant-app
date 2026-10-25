import { Global, Module } from '@nestjs/common';

import { AiUsageService } from './ai-usage.service.js';
import { SpendAlarmService } from './spend-alarm.service.js';

// Global: scans, the assistant and the card drafter all record their calls.
@Global()
@Module({
  providers: [AiUsageService, SpendAlarmService],
  exports: [AiUsageService, SpendAlarmService],
})
export class CostsModule {}
