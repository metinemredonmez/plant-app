import { Body, Controller } from '@nestjs/common';

import {
  type AuthUser,
  AuthRateLimited,
  CurrentUser,
  OptionalAuth,
  OptionalUser,
  Public,
} from '../auth/auth.decorators.js';
import { LegacyPost } from '../common/legacy-post.decorator.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import {
  type ChangePasswordBody,
  changePasswordSchema,
  type SendEmailBody,
  sendEmailSchema,
  type SendPhoneBody,
  sendPhoneSchema,
  type VerifyEmailBody,
  verifyEmailSchema,
  type VerifyPhoneBody,
  verifyPhoneSchema,
} from './verification.schemas.js';
import { VerificationService } from './verification.service.js';

/** The legacy OTP and password routes; all rate limited per IP. */
@Controller()
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @OptionalAuth()
  @AuthRateLimited()
  @LegacyPost('send/otp/email')
  sendEmail(
    @OptionalUser() caller: AuthUser | undefined,
    @Body(new ZodBody(sendEmailSchema)) body: SendEmailBody,
  ) {
    return this.verification.sendEmailCode(caller, body);
  }

  @OptionalAuth()
  @AuthRateLimited()
  @LegacyPost('verify/otp/email')
  verifyEmail(
    @OptionalUser() caller: AuthUser | undefined,
    @Body(new ZodBody(verifyEmailSchema)) body: VerifyEmailBody,
  ) {
    return this.verification.verifyEmailCode(caller, body);
  }

  @AuthRateLimited()
  @LegacyPost('send/otp/phone')
  sendPhone(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(sendPhoneSchema)) body: SendPhoneBody,
  ) {
    return this.verification.sendPhoneCode(caller, body);
  }

  @AuthRateLimited()
  @LegacyPost('verify/otp/phone')
  verifyPhone(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(verifyPhoneSchema)) body: VerifyPhoneBody,
  ) {
    return this.verification.verifyPhoneCode(caller, body);
  }

  @Public()
  @AuthRateLimited()
  @LegacyPost('change/password')
  changePassword(
    @Body(new ZodBody(changePasswordSchema)) body: ChangePasswordBody,
  ) {
    return this.verification.changePassword(body);
  }
}
