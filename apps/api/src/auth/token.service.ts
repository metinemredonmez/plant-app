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

/** Only the hash of a refresh token is stored, never the token itself. */
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

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
      { sub: String(user.id), role: user.role },
      { expiresIn: this.accessTtlSeconds },
    );
    return { token, refreshToken };
  }

  async verifyAccess(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: Role }>(
        token,
      );
      return { id: Number(payload.sub), role: payload.role };
    } catch {
      throw new UnauthorizedException(EXPIRED);
    }
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
