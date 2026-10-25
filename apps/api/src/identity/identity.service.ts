import { randomBytes, randomUUID } from 'node:crypto';

import {
  BadGatewayException,
  Inject,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PasswordService } from '../auth/password.service.js';
import { TokenService } from '../auth/token.service.js';
import { DAY_MS, istanbulDayStart } from '../care/season.js';
import type { Env } from '../config/env.js';
import {
  type AuthProvider,
  Prisma,
  type User,
} from '../generated/prisma/client.js';
import { DeliveryError, SmsSender } from '../messaging/senders.js';
import { OtpService } from '../otp/otp.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppleSiwa } from './apple-siwa.js';
import { IdTokenVerifier, InvalidIdToken } from './id-tokens.js';
import { maskedPhone, phoneHash, turkishMobile } from './phone.js';
import { SecretBox } from './secret-box.js';

/** Accounts without an e-mail address get an address that never delivers. */
export const NO_EMAIL_DOMAIN = '@users.everbloom.invalid';
export const hasRealEmail = (email: string) =>
  !email.endsWith(NO_EMAIL_DOMAIN) && !email.endsWith('@invalid.everbloom');

const PHONE_CODE_TTL_SECONDS = 300;
const RESEND_SECONDS = 60;

interface Profile {
  email?: string;
  emailVerified?: boolean;
  name?: string;
  hint?: string;
}

/** Login SMS: the code, its lifetime, no marketing (İYS). */
export function loginSms(code: string, retrieverHash?: string) {
  const text = `EverBloom giriş kodun: ${code}. 5 dakika geçerli, kimseyle paylaşma.`;
  // Android SMS Retriever reads the code when the app's hash ends the text.
  return retrieverHash ? `${text}\n${retrieverHash}` : text;
}

/**
 * Sign in with Apple, Google or a phone number (docs/adr/0012). All three
 * end in the same session as e-mail and password. "Sign up" and "sign in"
 * are one call: whether an account existed never leaks to the caller other
 * than through `isNew`, which only the person signing in sees.
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
    private readonly otp: OtpService,
    private readonly sms: SmsSender,
    private readonly verifier: IdTokenVerifier,
    private readonly apple: AppleSiwa,
    @Inject(SecretBox) private readonly box: SecretBox | null,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private enabled(
    method: 'AUTH_APPLE_ENABLED' | 'AUTH_GOOGLE_ENABLED' | 'AUTH_PHONE_ENABLED',
  ) {
    // Off reads like a route that does not exist.
    if (!this.config.get(method, { infer: true }))
      throw new NotFoundException();
  }

  async withApple(body: {
    identityToken: string;
    nonce: string;
    authorizationCode?: string;
    fullName?: string;
  }) {
    this.enabled('AUTH_APPLE_ENABLED');
    const identity = await this.verifier
      .apple(body.identityToken, body.nonce)
      .catch((error: unknown) => this.rejected('Apple', error));
    const { user, isNew, identityId } = await this.signIn(
      'APPLE',
      identity.subject,
      {
        email: identity.email,
        emailVerified: identity.emailVerified,
        // Apple sends the name only the first time.
        name: body.fullName,
      },
    );
    if (body.authorizationCode && this.box) {
      const refreshToken = await this.apple.exchange(body.authorizationCode);
      if (refreshToken) {
        await this.prisma.authIdentity.update({
          where: { id: identityId },
          data: { appleRefreshToken: this.box.seal(refreshToken) },
        });
      }
    }
    return this.session(user, 'APPLE', isNew);
  }

  async withGoogle(body: { idToken: string }) {
    this.enabled('AUTH_GOOGLE_ENABLED');
    const identity = await this.verifier
      .google(body.idToken)
      .catch((error: unknown) => this.rejected('Google', error));
    const { user, isNew } = await this.signIn(
      'GOOGLE',
      identity.subject,
      identity,
    );
    return this.session(user, 'GOOGLE', isNew);
  }

  private number(phone: string) {
    const e164 = turkishMobile(phone);
    if (!e164) {
      throw new UnprocessableEntityException(
        'Yalnız Türkiye (+90) cep telefonu numaraları kabul ediliyor',
      );
    }
    const pepper = this.config.get('PHONE_PEPPER', { infer: true })!;
    return { e164, target: phoneHash(pepper, e164) };
  }

  async sendPhoneCode(body: { phone: string }) {
    this.enabled('AUTH_PHONE_ENABLED');
    const { e164, target } = this.number(body.phone);
    // SMS pumping costs money even when nothing is delivered: a cap per
    // number per 24 hours and one for the whole service per day.
    const [forNumber, today] = await Promise.all([
      this.prisma.otpCode.count({
        where: {
          target,
          purpose: 'PHONE_LOGIN',
          createdAt: { gte: new Date(Date.now() - DAY_MS) },
        },
      }),
      this.prisma.otpCode.count({
        where: {
          purpose: 'PHONE_LOGIN',
          createdAt: { gte: istanbulDayStart() },
        },
      }),
    ]);
    if (
      forNumber >=
      this.config.get('PHONE_CODES_PER_NUMBER_PER_DAY', { infer: true })
    ) {
      throw new HttpException(
        'Bu numaraya bugün çok kod gönderildi. Yarın yeniden dene ya da başka bir yolla giriş yap.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (today >= this.config.get('PHONE_CODES_PER_DAY', { infer: true })) {
      this.logger.error('daily phone login SMS cap reached');
      throw new HttpException(
        'Telefonla giriş şu an kullanılamıyor. Başka bir yolla giriş yapabilirsin.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const otp = { target, purpose: 'PHONE_LOGIN' as const };
    const code = await this.otp.issue(otp);
    try {
      await this.sms.send(
        e164,
        loginSms(code, this.config.get('SMS_RETRIEVER_HASH', { infer: true })),
      );
    } catch (error) {
      await this.otp.cancel(otp);
      if (error instanceof DeliveryError) {
        throw new BadGatewayException(
          'SMS gönderilemedi, lütfen biraz sonra tekrar dene',
        );
      }
      throw error;
    }
    return {
      sentTo: maskedPhone(e164.slice(-2)),
      codeLength: 6,
      expiresInSeconds: PHONE_CODE_TTL_SECONDS,
      resendInSeconds: RESEND_SECONDS,
    };
  }

  async verifyPhoneCode(body: { phone: string; code: string }) {
    this.enabled('AUTH_PHONE_ENABLED');
    const { e164, target } = this.number(body.phone);
    await this.otp.verify({ target, purpose: 'PHONE_LOGIN' }, body.code);
    const { user, isNew } = await this.signIn('PHONE', target, {
      hint: e164.slice(-2),
    });
    return this.session(user, 'PHONE', isNew);
  }

  private rejected(provider: string, error: unknown): never {
    if (error instanceof InvalidIdToken) {
      this.logger.warn(`${provider} token rejected: ${error.message}`);
      throw new UnauthorizedException(
        `${provider} ile giriş doğrulanamadı, lütfen tekrar dene`,
      );
    }
    throw error;
  }

  /**
   * The account behind an identity: the linked one, else the one with the
   * same e-mail when the provider verified that address, else a new one.
   */
  private async signIn(
    provider: AuthProvider,
    subject: string,
    profile: Profile,
  ): Promise<{ user: User; isNew: boolean; identityId: number }> {
    const linked = await this.prisma.authIdentity.findUnique({
      where: { provider_subject: { provider, subject } },
      include: { user: true },
    });
    if (linked && !linked.user.anonymizedAt) {
      await this.prisma.authIdentity.update({
        where: { id: linked.id },
        data: { lastUsedAt: new Date(), hint: profile.hint ?? linked.hint },
      });
      return { user: linked.user, isNew: false, identityId: linked.id };
    }

    const email = profile.email?.trim().toLowerCase();
    const verifiedEmail = email && profile.emailVerified ? email : undefined;
    const sameEmail = verifiedEmail
      ? await this.prisma.user.findUnique({ where: { email: verifiedEmail } })
      : null;
    let user: User;
    let isNew = false;
    if (sameEmail && !sameEmail.anonymizedAt) {
      user = sameEmail.emailVerified
        ? sameEmail
        : await this.prisma.user.update({
            where: { id: sameEmail.id },
            data: { emailVerified: true },
          });
    } else {
      user = await this.prisma.user.create({
        data: {
          name: profile.name?.trim() || 'EverBloom üyesi',
          email:
            verifiedEmail && !sameEmail
              ? verifiedEmail
              : `${provider.toLowerCase()}-${randomUUID()}${NO_EMAIL_DOMAIN}`,
          emailVerified: !!verifiedEmail && !sameEmail,
          // Nobody knows this password; e-mail login stays closed unless the
          // person sets one with "Şifremi unuttum".
          passwordHash: await this.passwords.hash(
            randomBytes(24).toString('hex'),
          ),
        },
      });
      isNew = true;
    }
    try {
      const identity = await this.prisma.authIdentity.create({
        data: { userId: user.id, provider, subject, hint: profile.hint },
      });
      return { user, isNew, identityId: identity.id };
    } catch (error) {
      // A parallel sign-in with the same identity won; use its account.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (isNew) await this.prisma.user.delete({ where: { id: user.id } });
        return this.signIn(provider, subject, profile);
      }
      throw error;
    }
  }

  private async session(user: User, method: AuthProvider, isNew: boolean) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSignInMethod: method },
    });
    return { ...(await this.tokens.issue(user)), isNew };
  }
}
