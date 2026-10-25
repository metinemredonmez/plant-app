import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { OtpService } from './otp.service.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [AuthModule],
  controllers: [VerificationController],
  providers: [OtpService, VerificationService],
})
export class OtpModule {}
