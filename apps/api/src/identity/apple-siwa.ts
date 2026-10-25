import { Logger } from '@nestjs/common';
import { importPKCS8, SignJWT } from 'jose';

export interface AppleSiwaConfig {
  /** https://appleid.apple.com, or a test server. */
  authUrl: string;
  /** Bundle id: the client_id at Apple and the `aud` of identity tokens. */
  clientId: string;
  teamId?: string;
  keyId?: string;
  /** .p8 content; one-line values with \n escapes work too. */
  privateKey?: string;
}

/**
 * Sign in with Apple, server side: turns the one-time `authorizationCode`
 * from the sign-in into a refresh token, and revokes that token when the
 * account is deleted (App Store 5.1.1(v): deleting the account must also
 * end the app's access in the person's Apple ID settings).
 *
 * Never throws: a failed exchange still lets the person in, a failed
 * revocation is queued and retried (AppleRevocationsService).
 */
export class AppleSiwa {
  private readonly logger = new Logger('AppleSiwa');

  constructor(private readonly config: AppleSiwaConfig) {}

  get configured() {
    return !!(
      this.config.teamId &&
      this.config.keyId &&
      this.config.privateKey
    );
  }

  /** ES256 client secret: iss team, sub bundle id, aud Apple, 5 minutes. */
  private async clientSecret() {
    const key = await importPKCS8(
      this.config.privateKey!.replace(/\\n/g, '\n').trim(),
      'ES256',
    );
    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.config.keyId })
      .setIssuer(this.config.teamId!)
      .setSubject(this.config.clientId)
      .setAudience('https://appleid.apple.com')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(key);
  }

  private async post(path: string, fields: Record<string, string>) {
    const response = await fetch(new URL(path, this.config.authUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: await this.clientSecret(),
        ...fields,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    // /auth/revoke answers 200 with an empty body.
    const body = (await response.json().catch(() => ({}))) as {
      refresh_token?: string;
      error?: string;
    };
    return { ok: response.ok, status: response.status, body };
  }

  /** authorizationCode → refresh token, or null. */
  async exchange(authorizationCode: string): Promise<string | null> {
    if (!this.configured) return null;
    try {
      const { ok, status, body } = await this.post('/auth/token', {
        code: authorizationCode,
        grant_type: 'authorization_code',
      });
      if (!ok || !body.refresh_token) {
        this.logger.warn(`token exchange ${status}: ${body.error ?? '-'}`);
        return null;
      }
      return body.refresh_token;
    } catch (error) {
      this.logger.warn(`token exchange failed: ${String(error)}`);
      return null;
    }
  }

  /** Revokes the refresh token; false when Apple could not be told. */
  async revoke(refreshToken: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.configured) return { ok: false, error: 'not configured' };
    try {
      const { ok, status, body } = await this.post('/auth/revoke', {
        token: refreshToken,
        token_type_hint: 'refresh_token',
      });
      return ok
        ? { ok }
        : { ok, error: `${status} ${body.error ?? ''}`.trim() };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }
}
