import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import type { OtpCode, OtpPurpose } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Verification codes have 5 digits (the old app's inputs: ^\d{5}$) and live
// 10 minutes. Phone login codes are 6 digits for 5 minutes, which iOS
// one-time-code autofill and Android SMS Retriever both handle.
const POLICY: Record<OtpPurpose, { length: number; ttlMs: number }> = {
  EMAIL_VERIFY: { length: 5, ttlMs: 10 * 60_000 },
  PHONE_VERIFY: { length: 5, ttlMs: 10 * 60_000 },
  PASSWORD_RESET: { length: 5, ttlMs: 10 * 60_000 },
  PHONE_LOGIN: { length: 6, ttlMs: 5 * 60_000 },
};
const RESEND_AFTER_MS = 60_000;
/** Wrong guesses allowed per code; the next attempt is refused. */
export const MAX_ATTEMPTS = 5;

export interface OtpTarget {
  /** Normalised e-mail address or +90 phone number */
  target: string;
  purpose: OtpPurpose;
}

/**
 * One-time codes for e-mail and phone verification, password reset and
 * phone login. Only a keyed hash is stored; a new one can be
 * requested every 60 seconds (which voids the previous one), and a code is
 * locked after 5 wrong guesses.
 */
@Injectable()
export class OtpService {
  private readonly key: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.key = config.get('JWT_SECRET', { infer: true });
  }

  private hash({ target, purpose }: OtpTarget, code: string) {
    return createHmac('sha256', this.key)
      .update(`${purpose}:${target}:${code}`)
      .digest('hex');
  }

  /** Creates a code and returns it in plain text for sending. */
  async issue(otp: OtpTarget, userId?: number): Promise<string> {
    const latest = await this.prisma.otpCode.findFirst({
      where: { ...otp, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_AFTER_MS) {
      throw new HttpException(
        'Yeni kod istemeden önce 60 saniye bekleyin',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { length, ttlMs } = POLICY[otp.purpose];
    const code = String(randomInt(0, 10 ** length)).padStart(length, '0');
    await this.prisma.$transaction([
      // A new code voids the older ones for the same target and purpose.
      this.prisma.otpCode.updateMany({
        where: { ...otp, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.otpCode.create({
        data: {
          ...otp,
          userId,
          codeHash: this.hash(otp, code),
          expiresAt: new Date(Date.now() + ttlMs),
        },
      }),
    ]);
    return code;
  }

  /** Voids the open code, e.g. when it could not be delivered. */
  async cancel(otp: OtpTarget) {
    await this.prisma.otpCode.updateMany({
      where: { ...otp, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  /** Consumes the code or throws: 422 expired/missing, 429 locked, 401 wrong. */
  async verify(otp: OtpTarget, code: string): Promise<OtpCode> {
    const stored = await this.prisma.otpCode.findFirst({
      where: { ...otp, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      throw new UnprocessableEntityException(
        'Kodun süresi doldu, lütfen yeni kod isteyin',
      );
    }
    // Count the attempt first and atomically, so parallel guesses cannot
    // get past the limit.
    const counted = await this.prisma.otpCode.updateMany({
      where: { id: stored.id, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw new HttpException(
        'Çok fazla hatalı deneme yapıldı, lütfen yeni kod isteyin',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expected = Buffer.from(stored.codeHash, 'hex');
    const actual = Buffer.from(this.hash(otp, code), 'hex');
    if (!timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Kod hatalı');
    }

    const claimed = await this.prisma.otpCode.updateMany({
      where: { id: stored.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new UnprocessableEntityException('Bu kod zaten kullanıldı');
    }
    return stored;
  }
}
