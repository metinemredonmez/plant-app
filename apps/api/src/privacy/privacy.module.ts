import { Module } from '@nestjs/common';

import { AuditModule } from '../admin/audit.module.js';
import { LegalModule } from '../legal/legal.module.js';
import { OtpModule } from '../otp/otp.module.js';
import { UsersModule } from '../users/users.module.js';
import { PrivacyService } from './privacy.service.js';
import { RetentionService } from './retention.service.js';
import { WebController } from './web.controller.js';

@Module({
  imports: [AuditModule, LegalModule, OtpModule, UsersModule],
  controllers: [WebController],
  providers: [PrivacyService, RetentionService],
  exports: [PrivacyService, RetentionService],
})
export class PrivacyModule {}
