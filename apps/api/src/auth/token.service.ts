import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Env } from '../config/env.js';
import type { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './auth.decorators.js';

export interface TokenPair {
  token: string;
  refreshToken: string;
}

const EXPIRED = 'Oturum süresi doldu, lütfen tekrar giriş yapın';
const RESET_INVALID =
  'Şifre sıfırlama süresi doldu, lütfen yeni bir kod isteyin';
const RESET_TTL_SECONDS = 15 * 60;

/** Only the hash of a refresh token is stored, never the token itself. */
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/** Changes whenever the password changes; reveals nothing about it. */
const fingerprint = (passwordHash: string) => digest(passwordHash).slice(0, 16);

@Injectable()
export class TokenService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTtlSeconds = config.get('ACCESS_TOKEN_TTL_SECONDS', {
      infer: true,
    });
    this.refreshTtlMs =
      config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000;
  }

  /** Starts a session, or continues `familyId` when rotating. */
  async issue(
    user: { id: number; role: Role },
    familyId: string = randomUUID(),
  ): Promise<TokenPair> {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: digest(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });
    const token = await this.jwt.signAsync(
      { sub: String(user.id), role: user.role, typ: 'access' },
      { expiresIn: this.accessTtlSeconds },
    );
    return { token, refreshToken };
  }

  async verifyAccess(token: string): Promise<AuthUser> {
    const payload = await this.jwt
      .verifyAsync<{ sub: string; role: Role; typ?: string }>(token)
      .catch(() => null);
    // `typ` keeps a password-reset token from being used as a session.
    if (payload?.typ !== 'access') throw new UnauthorizedException(EXPIRED);
    return { id: Number(payload.sub), role: payload.role };
  }

  /**
   * Proof that the caller verified a PASSWORD_RESET code, valid for 15
   * minutes. It is bound to the current password hash, so it works once:
   * after the change the fingerprint no longer matches.
   */
  issueResetToken(user: { id: number; passwordHash: string }) {
    return this.jwt.signAsync(
      {
        sub: String(user.id),
        typ: 'reset',
        pwv: fingerprint(user.passwordHash),
      },
      { expiresIn: RESET_TTL_SECONDS },
    );
  }

  /** Returns the user id if `token` is a valid, unused reset token. */
  async verifyResetToken(
    token: string,
    currentPasswordHash: (id: number) => Promise<string | null>,
  ) {
    const payload = await this.jwt
      .verifyAsync<{ sub: string; typ?: string; pwv?: string }>(token)
      .catch(() => null);
    if (payload?.typ !== 'reset')
      throw new UnauthorizedException(RESET_INVALID);
    const userId = Number(payload.sub);
    const hash = await currentPasswordHash(userId);
    if (!hash || payload.pwv !== fingerprint(hash)) {
      throw new UnauthorizedException(RESET_INVALID);
    }
    return userId;
  }

  /** Ends every session of a user (password change, account deletion). */
  async revokeAll(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Exchanges a refresh token for a new pair (rotation). A token that was
   * already rotated is being replayed, so its whole family is revoked: the
   * thief and the victim both have to log in again.
   */
  async rotate(refreshToken: string): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: digest(refreshToken) },
      include: {
        user: { select: { id: true, role: true, anonymizedAt: true } },
      },
    });
    if (!stored || stored.user.anonymizedAt) {
      throw new UnauthorizedException(EXPIRED);
    }
    // Claim atomically, so two concurrent refreshes cannot both succeed.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      if (stored.revokedAt) await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(EXPIRED);
    }
    return this.issue(stored.user, stored.familyId);
  }

  async revoke(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: digest(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
