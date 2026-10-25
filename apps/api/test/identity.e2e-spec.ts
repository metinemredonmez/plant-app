import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  type JWK,
  SignJWT,
} from 'jose';
import request from 'supertest';

import { AppleRevocationsService } from '../src/identity/apple-revocations.service.js';
import { Outbox } from '../src/messaging/outbox.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';
import { bearer, signUp, uniqueEmail } from './helpers.js';

const BUNDLE_ID = 'com.everbloom.care';
const GOOGLE_WEB = 'web-client.apps.googleusercontent.com';
const GOOGLE_IOS = 'ios-client.apps.googleusercontent.com';
const RETRIEVER_HASH = 'AbCdEfGhIjK';

let app: NestExpressApplication;
let prisma: PrismaService;
let provider: Server;
const http = () => request(app.getHttpServer());

// A stand-in for appleid.apple.com and Google's certificate endpoint.
let signingKey: CryptoKey;
let publicJwk: JWK;
let revokeOk = true;
const appleCalls: { path: string; body: URLSearchParams }[] = [];

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function idToken(
  claims: Record<string, unknown>,
  options: { exp?: string } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt()
    .setExpirationTime(options.exp ?? '10m')
    .sign(signingKey);
}

const appleToken = (
  sub: string,
  nonce: string,
  extra: Record<string, unknown> = {},
) =>
  idToken({
    iss: 'https://appleid.apple.com',
    aud: BUNDLE_ID,
    sub,
    nonce: sha256(nonce),
    ...extra,
  });

const googleToken = (sub: string, extra: Record<string, unknown> = {}) =>
  idToken({
    iss: 'https://accounts.google.com',
    aud: GOOGLE_WEB,
    sub,
    ...extra,
  });

const nonce = () => randomBytes(16).toString('hex');
const uniqueSub = () => `sub-${randomBytes(6).toString('hex')}`;
let phoneCounter = 0;
const uniqueMobile = () =>
  `0 5${String(Date.now() + ++phoneCounter).slice(-9)}`;

async function me(token: string) {
  return (await http().get('/api/v1/me').set(bearer(token)).expect(200)).body;
}

beforeAll(async () => {
  const keys = await generateKeyPair('RS256');
  signingKey = keys.privateKey;
  publicJwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: 'test-key',
    alg: 'RS256',
    use: 'sig',
  };
  provider = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (req.url === '/auth/keys' || req.url === '/google/certs') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ keys: [publicJwk] }));
        return;
      }
      appleCalls.push({ path: req.url ?? '', body: new URLSearchParams(raw) });
      if (req.url === '/auth/token') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ refresh_token: 'apple-refresh-token-1' }));
      } else if (req.url === '/auth/revoke') {
        res.statusCode = revokeOk ? 200 : 503;
        res.end();
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((resolve) =>
    provider.listen(0, '127.0.0.1', resolve),
  );
  const base = `http://127.0.0.1:${(provider.address() as AddressInfo).port}`;

  const appleKey = await generateKeyPair('ES256', { extractable: true });
  Object.assign(process.env, {
    AUTH_APPLE_ENABLED: 'true',
    APPLE_TEAM_ID: 'TEAMID1234',
    APPLE_KEY_ID: 'KEYID12345',
    APPLE_PRIVATE_KEY: (await exportPKCS8(appleKey.privateKey)).replace(
      /\n/g,
      '\\n',
    ),
    TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    APPLE_AUTH_URL: base,
    AUTH_GOOGLE_ENABLED: 'true',
    GOOGLE_WEB_CLIENT_ID: GOOGLE_WEB,
    GOOGLE_IOS_CLIENT_ID: GOOGLE_IOS,
    GOOGLE_JWKS_URL: `${base}/google/certs`,
    AUTH_PHONE_ENABLED: 'true',
    PHONE_PEPPER: 'e2e-phone-pepper-that-is-long-enough!!',
    PHONE_CODES_PER_NUMBER_PER_DAY: '3',
    SMS_RETRIEVER_HASH: RETRIEVER_HASH,
  });
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
  await new Promise((resolve) => provider.close(resolve));
});

describe('app config', () => {
  it('lists the methods that are switched on', async () => {
    const res = await http().get('/api/v1/app-config').expect(200);
    expect(res.body).toEqual({
      minAppVersion: '1.0.0',
      auth: {
        email: true,
        apple: true,
        google: { webClientId: GOOGLE_WEB, iosClientId: GOOGLE_IOS },
        phone: true,
      },
      paywallOnboarding: true,
    });
  });
});

describe('Sign in with Apple', () => {
  it('opens an account once, then signs into the same one', async () => {
    const sub = uniqueSub();
    const email = uniqueEmail();
    const raw = nonce();
    const first = await http()
      .post('/api/v1/auth/apple')
      .send({
        identityToken: await appleToken(sub, raw, {
          email,
          email_verified: 'true',
        }),
        nonce: raw,
        authorizationCode: 'apple-code-1',
        fullName: 'Elif Çiçek',
      })
      .expect(200);
    expect(first.body).toMatchObject({
      token: expect.any(String),
      refreshToken: expect.any(String),
      isNew: true,
    });
    expect(await me(first.body.token)).toMatchObject({
      name: 'Elif Çiçek',
      email,
      emailVerified: true,
      signInMethod: 'APPLE',
      missingSteps: ['profile', 'paywall'],
    });

    // The authorization code became a refresh token, stored sealed.
    expect(
      appleCalls.find((c) => c.path === '/auth/token')?.body.get('code'),
    ).toBe('apple-code-1');
    const identity = await prisma.authIdentity.findFirstOrThrow({
      where: { provider: 'APPLE', subject: sub },
    });
    expect(identity.appleRefreshToken).toBeTruthy();
    expect(identity.appleRefreshToken).not.toContain('apple-refresh-token-1');

    // Later sign-ins carry no e-mail and no name.
    const raw2 = nonce();
    const again = await http()
      .post('/api/v1/auth/apple')
      .send({ identityToken: await appleToken(sub, raw2), nonce: raw2 })
      .expect(200);
    expect(again.body.isNew).toBe(false);
    expect((await me(again.body.token)).id).toBe(
      (await me(first.body.token)).id,
    );
  });

  it('refuses a replayed nonce, another app and an expired token', async () => {
    const sub = uniqueSub();
    const raw = nonce();
    await http()
      .post('/api/v1/auth/apple')
      .send({ identityToken: await appleToken(sub, raw), nonce: nonce() })
      .expect(401);
    const otherApp = await idToken({
      iss: 'https://appleid.apple.com',
      aud: 'com.someone.else',
      sub,
      nonce: sha256(raw),
    });
    await http()
      .post('/api/v1/auth/apple')
      .send({ identityToken: otherApp, nonce: raw })
      .expect(401);
    const expired = await idToken(
      {
        iss: 'https://appleid.apple.com',
        aud: BUNDLE_ID,
        sub,
        nonce: sha256(raw),
      },
      { exp: '-1m' },
    );
    const res = await http()
      .post('/api/v1/auth/apple')
      .send({ identityToken: expired, nonce: raw })
      .expect(401);
    expect(res.body.message).toBe(
      'Apple ile giriş doğrulanamadı, lütfen tekrar dene',
    );
    expect(await prisma.authIdentity.count({ where: { subject: sub } })).toBe(
      0,
    );
  });
});

describe('Google', () => {
  it('joins the account with the same verified e-mail', async () => {
    const existing = await signUp(app, 'Deniz Yıldız');
    const res = await http()
      .post('/api/v1/auth/google')
      .send({
        idToken: await googleToken(uniqueSub(), {
          email: existing.user.email.toUpperCase(),
          email_verified: true,
          name: 'Başka Ad',
        }),
      })
      .expect(200);
    expect(res.body.isNew).toBe(false);
    expect(await me(res.body.token)).toMatchObject({
      id: existing.user.id,
      name: 'Deniz Yıldız',
      signInMethod: 'GOOGLE',
    });
  });

  it('does not take over an account over an unverified e-mail', async () => {
    const existing = await signUp(app);
    const res = await http()
      .post('/api/v1/auth/google')
      .send({
        idToken: await googleToken(uniqueSub(), {
          email: existing.user.email,
          email_verified: false,
          name: 'Ece',
        }),
      })
      .expect(200);
    expect(res.body.isNew).toBe(true);
    const profile = await me(res.body.token);
    expect(profile.id).not.toBe(existing.user.id);
    expect(profile).toMatchObject({
      name: 'Ece',
      email: null,
      emailVerified: false,
    });
  });

  it('refuses a token for another client', async () => {
    const token = await idToken({
      iss: 'https://accounts.google.com',
      aud: 'someone-else.apps.googleusercontent.com',
      sub: uniqueSub(),
    });
    await http()
      .post('/api/v1/auth/google')
      .send({ idToken: token })
      .expect(401);
  });
});

describe('phone', () => {
  const e164 = (phone: string) => `+90${phone.replace(/\D/g, '').slice(1)}`;
  const lastSms = (phone: string) => app.get(Outbox).latestTo(e164(phone))!;
  const codeOf = (text: string) => text.match(/\b(\d{6})\b/)![1];

  it('sends a 6-digit code to a +90 mobile and signs in with it', async () => {
    const phone = uniqueMobile();
    const digits = phone.replace(/\D/g, '');
    const sent = await http()
      .post('/api/v1/auth/phone/code')
      .send({ phone })
      .expect(200);
    expect(sent.body).toEqual({
      sentTo: `•••• ••• •• ${digits.slice(-2)}`,
      codeLength: 6,
      expiresInSeconds: 300,
      resendInSeconds: 60,
    });
    expect(JSON.stringify(sent.body)).not.toContain(digits.slice(1));

    const sms = lastSms(phone);
    expect(sms.to).toBe(`+90${digits.slice(1)}`);
    expect(sms.text).toMatch(
      /^EverBloom giriş kodun: \d{6}\. 5 dakika geçerli/,
    );
    expect(sms.text.endsWith(`\n${RETRIEVER_HASH}`)).toBe(true);
    // Only a hash of the number is stored.
    const stored = await prisma.otpCode.findFirstOrThrow({
      where: { purpose: 'PHONE_LOGIN' },
      orderBy: { id: 'desc' },
    });
    expect(stored.target).toMatch(/^[0-9a-f]{64}$/);

    await http()
      .post('/api/v1/auth/phone/verify')
      .send({
        phone,
        code: codeOf(sms.text) === '000000' ? '111111' : '000000',
      })
      .expect(401);
    const signedIn = await http()
      .post('/api/v1/auth/phone/verify')
      .send({ phone, code: codeOf(sms.text) })
      .expect(200);
    expect(signedIn.body.isNew).toBe(true);
    expect(await me(signedIn.body.token)).toMatchObject({
      name: '',
      email: null,
      signInMethod: 'PHONE',
      phoneHint: `•••• ••• •• ${digits.slice(-2)}`,
    });
    const identity = await prisma.authIdentity.findFirstOrThrow({
      where: { provider: 'PHONE', hint: digits.slice(-2) },
      orderBy: { id: 'desc' },
    });
    expect(identity.subject).not.toContain(digits.slice(1));

    // A code works once; the next sign-in with a new code finds the account.
    await http()
      .post('/api/v1/auth/phone/verify')
      .send({ phone, code: codeOf(sms.text) })
      .expect(422);
    await prisma.otpCode.updateMany({
      where: { target: stored.target },
      data: { createdAt: new Date(Date.now() - 120_000) },
    });
    await http().post('/api/v1/auth/phone/code').send({ phone }).expect(200);
    const again = await http()
      .post('/api/v1/auth/phone/verify')
      .send({
        phone: `+90${digits.slice(1)}`,
        code: codeOf(lastSms(phone).text),
      })
      .expect(200);
    expect(again.body.isNew).toBe(false);
  });

  it('takes only Turkish mobiles, waits 60 s between codes and caps a day', async () => {
    await http()
      .post('/api/v1/auth/phone/code')
      .send({ phone: '0212 123 45 67' })
      .expect(422);
    await http()
      .post('/api/v1/auth/phone/code')
      .send({ phone: '+44 7700 900123' })
      .expect(422);

    const phone = uniqueMobile();
    await http().post('/api/v1/auth/phone/code').send({ phone }).expect(200);
    await http().post('/api/v1/auth/phone/code').send({ phone }).expect(429);

    // Two more codes earlier today: the per-number cap of 3 is reached.
    const { target } = await prisma.otpCode.findFirstOrThrow({
      where: { purpose: 'PHONE_LOGIN' },
      orderBy: { id: 'desc' },
    });
    await prisma.otpCode.updateMany({
      where: { target },
      data: { createdAt: new Date(Date.now() - 3_600_000) },
    });
    await prisma.otpCode.createMany({
      data: [1, 2].map((i) => ({
        target,
        purpose: 'PHONE_LOGIN' as const,
        codeHash: 'x',
        expiresAt: new Date(),
        consumedAt: new Date(),
        createdAt: new Date(Date.now() - i * 3_600_000),
      })),
    });
    const capped = await http()
      .post('/api/v1/auth/phone/code')
      .send({ phone })
      .expect(429);
    expect(capped.body.message).toContain('bugün çok kod gönderildi');
  });
});

describe('onboarding steps', () => {
  it('clears the profile and paywall steps once done', async () => {
    const user = await signUp(app);
    expect((await me(user.token)).missingSteps).toEqual(['profile', 'paywall']);

    await http()
      .put('/api/v1/me/care-profile')
      .set(bearer(user.token))
      .send({
        experience: 'BEGINNER',
        spots: ['BALCONY', 'BALCONY'],
        pets: 'CAT',
        city: 'İzmir',
      })
      .expect(200);
    await http()
      .post('/api/v1/me/paywall-offered')
      .set(bearer(user.token))
      .expect(200);
    expect(await me(user.token)).toMatchObject({
      missingSteps: [],
      city: 'İzmir',
      careProfile: {
        experience: 'BEGINNER',
        spots: ['BALCONY'],
        goals: [],
        pets: 'CAT',
      },
    });
  });

  it('counts "Geç" on every question as asked', async () => {
    const user = await signUp(app);
    await http()
      .put('/api/v1/me/care-profile')
      .set(bearer(user.token))
      .send({})
      .expect(200);
    expect((await me(user.token)).missingSteps).toEqual(['paywall']);
    await http()
      .put('/api/v1/me/care-profile')
      .set(bearer(user.token))
      .send({ pets: 'HAMSTER' })
      .expect(422);
  });
});

describe('account deletion', () => {
  async function appleUser() {
    const raw = nonce();
    const res = await http()
      .post('/api/v1/auth/apple')
      .send({
        identityToken: await appleToken(uniqueSub(), raw),
        nonce: raw,
        authorizationCode: 'code',
      })
      .expect(200);
    const { id } = await me(res.body.token);
    return { id, token: res.body.token as string };
  }

  it('revokes Sign in with Apple and removes the links', async () => {
    revokeOk = true;
    const user = await appleUser();
    const before = appleCalls.length;
    await http()
      .delete(`/api/user/delete/${user.id}`)
      .set(bearer(user.token))
      .expect(200);
    const revoke = appleCalls
      .slice(before)
      .find((c) => c.path === '/auth/revoke');
    expect(revoke?.body.get('token')).toBe('apple-refresh-token-1');
    expect(revoke?.body.get('client_id')).toBe(BUNDLE_ID);
    expect(
      await prisma.authIdentity.count({ where: { userId: user.id } }),
    ).toBe(0);
  });

  it('retries a revocation Apple refused until it goes through', async () => {
    revokeOk = false;
    const user = await appleUser();
    await http()
      .delete(`/api/user/delete/${user.id}`)
      .set(bearer(user.token))
      .expect(200);
    const queued = await prisma.appleRevocation.findFirstOrThrow({
      orderBy: { id: 'desc' },
    });
    expect(queued).toMatchObject({
      attempts: 1,
      lastError: expect.stringContaining('503'),
    });
    expect(queued.refreshToken).not.toContain('apple-refresh-token-1');

    revokeOk = true;
    await prisma.appleRevocation.update({
      where: { id: queued.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    await app.get(AppleRevocationsService).runDue();
    expect(
      await prisma.appleRevocation.findUnique({ where: { id: queued.id } }),
    ).toBeNull();
  });
});
