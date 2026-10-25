import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/auth.decorators.js';
import { PasswordService } from '../auth/password.service.js';
import { TokenService } from '../auth/token.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { DeliveryError, EmailSender, SmsSender } from '../messaging/senders.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toLegacyUser } from '../users/legacy-user.mapper.js';
import {
  emailVerificationMail,
  otpSms,
  passwordResetMail,
} from './messages.js';
import { type OtpTarget, OtpService } from './otp.service.js';
import type {
  ChangePasswordBody,
  SendEmailBody,
  SendPhoneBody,
  VerifyEmailBody,
  VerifyPhoneBody,
} from './verification.schemas.js';

const SENT = { message: 'Kod gönderildi' };
const NO_CODE = 'Kodun süresi doldu, lütfen yeni kod isteyin';
const PHONE_TAKEN = 'Bu telefon numarası başka bir hesapta kayıtlı';

/**
 * The template's verification flows. The same e-mail endpoints serve two
 * purposes, told apart by the session: signed in → verify the account's
 * e-mail, signed out → reset the password ("forgot password").
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly sms: SmsSender,
    private readonly mail: EmailSender,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
  ) {}

  async sendEmailCode(caller: AuthUser | undefined, { email }: SendEmailBody) {
    if (caller) {
      const user = await this.self(caller);
      if (user.email !== email) {
        throw new ForbiddenException(
          'Yalnızca kendi e-posta adresinizi doğrulayabilirsiniz',
        );
      }
      if (user.emailVerified) {
        return { message: 'E-posta adresiniz zaten doğrulanmış' };
      }
      const target: OtpTarget = { target: email, purpose: 'EMAIL_VERIFY' };
      const code = await this.otp.issue(target, user.id);
      await this.deliver(target, () =>
        this.mail.send({ to: email, ...emailVerificationMail(code) }),
      );
      return SENT;
    }

    // Password reset answers the same whether or not the address is
    // registered, so the endpoint cannot be used to find accounts.
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.anonymizedAt) {
      const target: OtpTarget = { target: email, purpose: 'PASSWORD_RESET' };
      const code = await this.otp.issue(target, user.id);
      await this.deliver(target, () =>
        this.mail.send({ to: email, ...passwordResetMail(code) }),
      );
    }
    return SENT;
  }

  async verifyEmailCode(
    caller: AuthUser | undefined,
    { email, otp }: VerifyEmailBody,
  ) {
    if (caller) {
      const user = await this.self(caller);
      if (user.email !== email) {
        throw new ForbiddenException(
          'Yalnızca kendi e-posta adresinizi doğrulayabilirsiniz',
        );
      }
      await this.otp.verify({ target: email, purpose: 'EMAIL_VERIFY' }, otp);
      const verified = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      return { user: toLegacyUser(verified) };
    }

    const code = await this.otp.verify(
      { target: email, purpose: 'PASSWORD_RESET' },
      otp,
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.anonymizedAt || code.userId !== user.id) {
      throw new UnprocessableEntityException(NO_CODE);
    }
    // NewPassword sends this back to change/password.
    const resetToken = await this.tokens.issueResetToken(user);
    return { user: toLegacyUser(user), resetToken };
  }

  async sendPhoneCode(caller: AuthUser, { phoneNumber }: SendPhoneBody) {
    const user = await this.self(caller);
    if (user.phoneVerified && user.phoneNumber === phoneNumber) {
      return { message: 'Telefon numaranız zaten doğrulanmış' };
    }
    const owner = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (owner && owner.id !== user.id) throw new ConflictException(PHONE_TAKEN);

    const target: OtpTarget = { target: phoneNumber, purpose: 'PHONE_VERIFY' };
    const code = await this.otp.issue(target, user.id);
    await this.deliver(target, () => this.sms.send(phoneNumber, otpSms(code)));
    return SENT;
  }

  async verifyPhoneCode(
    caller: AuthUser,
    { phoneNumber, otp }: VerifyPhoneBody,
  ) {
    const code = await this.otp.verify(
      { target: phoneNumber, purpose: 'PHONE_VERIFY' },
      otp,
    );
    if (code.userId !== caller.id)
      throw new UnprocessableEntityException(NO_CODE);
    const user = await this.prisma.user
      .update({
        where: { id: caller.id, anonymizedAt: null },
        data: { phoneNumber, phoneVerified: true },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(PHONE_TAKEN);
        }
        throw error;
      });
    return { user: toLegacyUser(user) };
  }

  /**
   * The template sent only {email, password}, so anyone could reset any
   * account. Now the reset token from verify/otp/email is required, and
   * every session of the account ends.
   */
  async changePassword({ email, password, resetToken }: ChangePasswordBody) {
    if (!resetToken) {
      throw new UnauthorizedException(
        'Şifre değiştirmek için önce e-postanıza gelen kodu doğrulayın',
      );
    }
    const userId = await this.tokens.verifyResetToken(
      resetToken,
      async (id) => {
        const user = await this.prisma.user.findUnique({ where: { id } });
        return user && !user.anonymizedAt && user.email === email
          ? user.passwordHash
          : null;
      },
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(password) },
    });
    await this.tokens.revokeAll(userId);
    return {
      message: 'Şifreniz güncellendi, yeni şifrenizle giriş yapabilirsiniz',
    };
  }

  private async self(caller: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: caller.id },
    });
    if (!user || user.anonymizedAt) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    return user;
  }

  /** Voids the code if the provider rejects the message, so a retry works. */
  private async deliver(target: OtpTarget, send: () => Promise<void>) {
    try {
      await send();
    } catch (error) {
      await this.otp.cancel(target);
      if (error instanceof DeliveryError) {
        throw new BadGatewayException(
          'Kod gönderilemedi, lütfen biraz sonra tekrar deneyin',
        );
      }
      throw error;
    }
  }
}
