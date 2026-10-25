import { Module } from '@nestjs/common';

import { ConsentsModule } from '../consents/consents.module.js';
import { BillingController } from './billing.controller.js';
import { EntitlementsService } from './entitlements.service.js';
import { RevenueCatService } from './revenuecat.service.js';
import { UsageService } from './usage.service.js';

@Module({
  imports: [ConsentsModule],
  controllers: [BillingController],
  providers: [EntitlementsService, RevenueCatService, UsageService],
  exports: [EntitlementsService, UsageService],
})
export class BillingModule {}
