import { createHash } from 'node:crypto';

import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose';

export interface VerifiedIdentity {
  subject: string;
  email?: string;
  /** The provider says it verified the address. */
  emailVerified: boolean;
  name?: string;
}

/** The token is not valid for us; the caller answers 401. */
export class InvalidIdToken extends Error {}

/**
 * Apple sends `email_verified` as a boolean or as the string "true".
 * Anything else counts as not verified: no proof, no claim.
 */
export function claimTrue(value: unknown) {
  if (typeof value === 'boolean') return value;
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export interface IdTokenConfig {
  appleAuthUrl: string;
  appleAudience: string;
  googleJwksUrl: string;
  googleAudiences: string[];
}

/**
 * Checks Apple and Google identity tokens against the providers' published
 * keys (JWKS): signature, issuer, audience and expiry. Apple's also carries
 * the SHA-256 of the nonce the app generated for this sign-in, so a token
 * caught elsewhere cannot be replayed here.
 */
export class IdTokenVerifier {
  private readonly appleKeys;
  private readonly googleKeys;

  constructor(private readonly config: IdTokenConfig) {
    this.appleKeys = createRemoteJWKSet(
      new URL('/auth/keys', config.appleAuthUrl),
    );
    this.googleKeys = createRemoteJWKSet(new URL(config.googleJwksUrl));
  }

  async apple(idToken: string, rawNonce: string): Promise<VerifiedIdentity> {
    const payload = await this.verify(idToken, this.appleKeys, {
      issuer: 'https://appleid.apple.com',
      audience: this.config.appleAudience,
    });
    if (payload.nonce !== sha256(rawNonce)) {
      throw new InvalidIdToken('nonce mismatch');
    }
    return {
      subject: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email : undefined,
      emailVerified: claimTrue(payload.email_verified),
    };
  }

  async google(idToken: string): Promise<VerifiedIdentity> {
    const payload = await this.verify(idToken, this.googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: this.config.googleAudiences,
    });
    return {
      subject: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email : undefined,
      emailVerified: claimTrue(payload.email_verified),
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  }

  private async verify(
    token: string,
    keys: ReturnType<typeof createRemoteJWKSet>,
    options: { issuer: string | string[]; audience: string | string[] },
  ): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, keys, options);
      if (!payload.sub) throw new Error('no subject');
      return payload;
    } catch (error) {
      if (error instanceof InvalidIdToken) throw error;
      throw new InvalidIdToken(String(error));
    }
  }
}
