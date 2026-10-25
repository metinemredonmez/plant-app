import { responseSchemas } from '@everbloom/contract';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { Outbox } from '../src/messaging/outbox.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';
import {
  bearer,
  PASSWORD,
  type Session,
  signUp,
  uniqueEmail,
  uniquePhone,
} from './helpers.js';

// Week 4 acceptance: codes expire, lock after 5 wrong guesses (the 6th
// attempt is refused), and change/password needs the reset token.

let app: NestExpressApplication;
const http = () => request(app.getHttpServer());

/** The code in the newest message to `to` (SMS_DRIVER/EMAIL_DRIVER=log). */
function codeSentTo(to: string) {
  const message = app.get(Outbox).latestTo(to);
  const code = message?.text.match(/\b(\d{5})\b/)?.[1];
  if (!code) throw new Error(`no code sent to ${to}`);
  return code;
}

/** Lets the next code be requested without waiting 60 seconds. */
async function skipResendWait(target: string) {
  await app.get(PrismaService).otpCode.updateMany({
    where: { target },
    data: { createdAt: new Date(Date.now() - 61_000) },
  });
}

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('e-mail verification (signed in)', () => {
  let session: Session;

  beforeEach(async () => {
    session = await signUp(app);
  });

  const send = () =>
    http()
      .post('/api/send/otp/email')
      .set(bearer(session.token))
      .send({ email: session.user.email });
  const verify = (otp: string) =>
    http()
      .post('/api/verify/otp/email')
      .set(bearer(session.token))
      .send({ email: session.user.email, otp });

  it('sends a 5-digit code and verifies the e-mail', async () => {
    const sent = await send().expect(200);
    responseSchemas.SEND_EMAIL_OTP.parse(sent.body);
    const res = await verify(codeSentTo(session.user.email)).expect(200);
    responseSchemas.VERIFY_EMAIL_OTP.parse(res.body);
    expect(res.body.user.emailVerified).toBe(true);
    expect(res.body).not.toHaveProperty('resetToken');
  });

  it('stores only a hash of the code', async () => {
    await send().expect(200);
    const code = codeSentTo(session.user.email);
    const rows = await app
      .get(PrismaService)
      .otpCode.findMany({ where: { target: session.user.email } });
    expect(rows).toHaveLength(1);
    expect(rows[0].codeHash).not.toContain(code);
  });

  it('allows a new code only after 60 seconds (429 before)', async () => {
    await send().expect(200);
    const res = await send().expect(429);
    expect(res.body.message).toContain('60 saniye');
  });

  it('locks the code: 5 wrong guesses → 401, the 6th attempt → 429', async () => {
    await send().expect(200);
    const code = codeSentTo(session.user.email);
    const wrong = code === '00000' ? '11111' : '00000';
    for (let i = 0; i < 5; i++) await verify(wrong).expect(401);
    const locked = await verify(code).expect(429);
    expect(locked.body.message).toContain('yeni kod');
  });

  it('rejects an expired code with 422', async () => {
    await send().expect(200);
    const code = codeSentTo(session.user.email);
    await app.get(PrismaService).otpCode.updateMany({
      where: { target: session.user.email },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await verify(code).expect(422);
  });

  it('a new code voids the previous one', async () => {
    await send().expect(200);
    const first = codeSentTo(session.user.email);
    await skipResendWait(session.user.email);
    await send().expect(200);
    const second = codeSentTo(session.user.email);
    if (first !== second) await verify(first).expect(401);
    await verify(second).expect(200);
  });

  it("cannot verify someone else's address (403)", async () => {
    await http()
      .post('/api/send/otp/email')
      .set(bearer(session.token))
      .send({ email: 'baska@everbloom.test' })
      .expect(403);
  });
});

describe('phone verification', () => {
  it('sends an SMS code and stores the verified number', async () => {
    const session = await signUp(app);
    const phone = uniquePhone();
    // The app sends +90...; local formats are accepted too.
    await http()
      .post('/api/send/otp/phone')
      .set(bearer(session.token))
      .send({ email: session.user.email, phoneNumber: `0${phone.slice(3)}` })
      .expect(200);
    const res = await http()
      .post('/api/verify/otp/phone')
      .set(bearer(session.token))
      .send({ phoneNumber: phone, otp: codeSentTo(phone) })
      .expect(200);
    responseSchemas.VERIFY_PHONE_OTP.parse(res.body);
    expect(res.body.user).toMatchObject({
      phoneNumber: phone,
      phoneVerified: true,
    });
  });

  it('rejects a number that is not a Turkish mobile (422)', async () => {
    const session = await signUp(app);
    await http()
      .post('/api/send/otp/phone')
      .set(bearer(session.token))
      .send({ phoneNumber: '+4915123456789' })
      .expect(422);
  });

  it('refuses a number verified on another account (409)', async () => {
    const owner = await signUp(app);
    const phone = uniquePhone();
    await http()
      .post('/api/send/otp/phone')
      .set(bearer(owner.token))
      .send({ phoneNumber: phone })
      .expect(200);
    await http()
      .post('/api/verify/otp/phone')
      .set(bearer(owner.token))
      .send({ phoneNumber: phone, otp: codeSentTo(phone) })
      .expect(200);

    const other = await signUp(app);
    await http()
      .post('/api/send/otp/phone')
      .set(bearer(other.token))
      .send({ phoneNumber: phone })
      .expect(409);
  });

  it('requires a session (401)', async () => {
    await http()
      .post('/api/send/otp/phone')
      .send({ phoneNumber: uniquePhone() })
      .expect(401);
  });
});

describe('password reset (signed out)', () => {
  it('resets the password with the reset token and ends every session', async () => {
    const session = await signUp(app);
    const { email } = session.user;
    await http().post('/api/send/otp/email').send({ email }).expect(200);
    const verified = await http()
      .post('/api/verify/otp/email')
      .send({ email, otp: codeSentTo(email) })
      .expect(200);
    const { resetToken } = verified.body;
    expect(typeof resetToken).toBe('string');

    await http()
      .post('/api/change/password')
      .send({ email, password: 'yeni-parola-123', resetToken })
      .expect(200);

    await http()
      .post('/api/user/login')
      .send({ email, password: PASSWORD })
      .expect(401);
    await http()
      .post('/api/user/login')
      .send({ email, password: 'yeni-parola-123' })
      .expect(200);
    // Sessions opened before the reset are gone.
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    // The reset token works once.
    await http()
      .post('/api/change/password')
      .send({ email, password: 'ucuncu-parola-123', resetToken })
      .expect(401);
  });

  it('change/password without a reset token → 401 (the template had no check)', async () => {
    const { user } = await signUp(app);
    await http()
      .post('/api/change/password')
      .send({ email: user.email, password: 'ele-gecirildi-1' })
      .expect(401);
  });

  it('a reset token is not a session', async () => {
    const { user } = await signUp(app);
    await http()
      .post('/api/send/otp/email')
      .send({ email: user.email })
      .expect(200);
    const verified = await http()
      .post('/api/verify/otp/email')
      .send({ email: user.email, otp: codeSentTo(user.email) })
      .expect(200);
    await http()
      .get(`/api/user/${user.id}`)
      .set(bearer(verified.body.resetToken))
      .expect(401);
  });

  it("a reset token for one account cannot change another's password", async () => {
    const a = await signUp(app);
    const b = await signUp(app);
    await http()
      .post('/api/send/otp/email')
      .send({ email: a.user.email })
      .expect(200);
    const verified = await http()
      .post('/api/verify/otp/email')
      .send({ email: a.user.email, otp: codeSentTo(a.user.email) })
      .expect(200);
    await http()
      .post('/api/change/password')
      .send({
        email: b.user.email,
        password: 'ele-gecirildi-1',
        resetToken: verified.body.resetToken,
      })
      .expect(401);
  });

  it('answers the same for an unknown address and sends nothing', async () => {
    const email = uniqueEmail();
    const res = await http()
      .post('/api/send/otp/email')
      .send({ email })
      .expect(200);
    expect(res.body).toEqual({ message: 'Kod gönderildi' });
    expect(app.get(Outbox).latestTo(email)).toBeUndefined();
  });
});
