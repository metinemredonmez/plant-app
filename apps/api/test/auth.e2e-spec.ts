import { responseSchemas } from '@everbloom/contract';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';

// Week 3 acceptance: sessions are per user, a token only opens its own
// account (the template's IDOR), and an expired session logs the app out.

let app: NestExpressApplication;
const http = () => request(app.getHttpServer());
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const PASSWORD = 'parola123';
// Stands in for the template's shared app token: any non-JWT value.
const STATIC_TEMPLATE_TOKEN = 'shared-static-app-token-from-the-template';

let counter = 0;
const uniqueEmail = () =>
  `user-${Date.now()}-${process.pid}-${++counter}@everbloom.test`;

async function signUp(name = 'Zeynep Kaya') {
  const email = uniqueEmail();
  const res = await http()
    .post('/api/user/create')
    .send({ name, email, password: PASSWORD })
    .expect(200);
  return res.body as {
    user: { id: number; name: string; email: string };
    token: string;
    refreshToken: string;
  };
}

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('sign-up and login', () => {
  it('signs up with 200 (not 201) and returns a session', async () => {
    const res = await http()
      .post('/api/user/create')
      .send({ name: 'Şükrü Öztürk', email: uniqueEmail(), password: PASSWORD })
      .expect(200);
    responseSchemas.CREATE_USER.parse(res.body);
    expect(res.body.user.name).toBe('Şükrü Öztürk');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('stores the password as Argon2id, never in plain text', async () => {
    const { user } = await signUp();
    const row = await app
      .get(PrismaService)
      .user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row.passwordHash).not.toContain(PASSWORD);
  });

  it('rejects a duplicate e-mail with 409, case-insensitively', async () => {
    const { user } = await signUp();
    await http()
      .post('/api/user/create')
      .send({
        name: 'Biri',
        email: user.email.toUpperCase(),
        password: PASSWORD,
      })
      .expect(409);
  });

  it('rejects a password shorter than 8 characters with 422 {message}', async () => {
    const res = await http()
      .post('/api/user/create')
      .send({ name: 'Kısa Parola', email: uniqueEmail(), password: 'abc123' })
      .expect(422);
    expect(res.body).toEqual({ message: expect.stringContaining('password') });
  });

  it('logs in with 200 and a session', async () => {
    const { user } = await signUp();
    const res = await http()
      .post('/api/user/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    responseSchemas.LOGIN_USER.parse(res.body);
  });

  it('answers a wrong password and an unknown e-mail the same way', async () => {
    const { user } = await signUp();
    const wrong = await http()
      .post('/api/user/login')
      .send({ email: user.email, password: 'yanlis-parola' })
      .expect(401);
    const unknown = await http()
      .post('/api/user/login')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
  });
});

describe('IDOR: a token only opens its own account', () => {
  let alice: Awaited<ReturnType<typeof signUp>>;
  let bob: Awaited<ReturnType<typeof signUp>>;

  beforeAll(async () => {
    alice = await signUp('Alice');
    bob = await signUp('Bob');
  });

  it('reads its own profile and orders', async () => {
    const user = await http()
      .get(`/api/user/${alice.user.id}`)
      .set(bearer(alice.token))
      .expect(200);
    responseSchemas.GET_USER.parse(user.body);
    const orders = await http()
      .get(`/api/order/${alice.user.id}`)
      .set(bearer(alice.token))
      .expect(200);
    expect(orders.body).toEqual({ orders: [] });
  });

  it.each([
    ['GET', (id: number) => `/api/user/${id}`],
    ['GET', (id: number) => `/api/order/${id}`],
    ['PUT', (id: number) => `/api/user/update/${id}`],
    ['DELETE', (id: number) => `/api/user/delete/${id}`],
  ] as const)('%s %s of another user → 403', async (method, path) => {
    const call = http()[
      method === 'GET' ? 'get' : method === 'PUT' ? 'put' : 'delete'
    ](path(bob.user.id));
    const res = await call
      .set(bearer(alice.token))
      .send({ name: 'Ele geçirildi', location: '' })
      .expect(403);
    expect(res.body).toEqual({ message: expect.any(String) });
  });

  it('leaves the other account untouched', async () => {
    const res = await http()
      .get(`/api/user/${bob.user.id}`)
      .set(bearer(bob.token))
      .expect(200);
    expect(res.body.name).toBe('Bob');
  });

  it('requires a token (the old static app token no longer works)', async () => {
    await http().get(`/api/user/${alice.user.id}`).expect(401);
    await http()
      .get(`/api/user/${alice.user.id}`)
      .set(bearer(STATIC_TEMPLATE_TOKEN))
      .expect(401);
  });

  it('rejects an expired token with 401, which makes the app log out', async () => {
    const expired = await app.get(JwtService).signAsync({
      sub: String(alice.user.id),
      role: 'CUSTOMER',
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    await http()
      .get(`/api/user/${alice.user.id}`)
      .set(bearer(expired))
      .expect(401);
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await new JwtService({ secret: 'x'.repeat(40) }).signAsync({
      sub: String(bob.user.id),
      role: 'ADMIN',
    });
    await http()
      .get(`/api/user/${bob.user.id}`)
      .set(bearer(forged))
      .expect(401);
  });
});

describe('profile and orders', () => {
  it('updates its own profile and accepts Turkish letters', async () => {
    const { user, token } = await signUp();
    const res = await http()
      .put(`/api/user/update/${user.id}`)
      .set(bearer(token))
      .send({ name: 'Gülşen Çağlar', location: 'Üsküdar, İstanbul' })
      .expect(200);
    responseSchemas.UPDATE_USER.parse(res.body);
    expect(res.body.user).toMatchObject({
      name: 'Gülşen Çağlar',
      location: 'Üsküdar, İstanbul',
    });
  });

  it("lists the demo user's seeded orders with plant ids as line ids", async () => {
    const login = await http()
      .post('/api/user/login')
      .send({ email: 'demo@everbloom.test', password: 'demo1234' })
      .expect(200);
    const res = await http()
      .get(`/api/order/${login.body.user.id}`)
      .set(bearer(login.body.token))
      .expect(200);
    responseSchemas.GET_ORDERS.parse(res.body);
    expect(
      res.body.orders.map((o: { orderStatus: string }) => o.orderStatus),
    ).toEqual(['shipping', 'delivered']);
    const plants = await http().get('/api/plants').expect(200);
    const monstera = plants.body.find(
      (p: { name: string }) => p.name === 'Monstera Deliciosa 40-50 cm',
    );
    expect(res.body.orders[1].products[0]).toMatchObject({
      id: monstera.id,
      name: 'Monstera Deliciosa 40-50 cm',
      price: 749,
      quantity: 1,
    });
  });
});

describe('refresh token rotation', () => {
  it('exchanges a refresh token for a new pair', async () => {
    const session = await signUp();
    const res = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    responseSchemas.AUTH_REFRESH.parse(res.body);
    expect(res.body.refreshToken).not.toBe(session.refreshToken);
    await http()
      .get(`/api/user/${session.user.id}`)
      .set(bearer(res.body.token))
      .expect(200);
  });

  it('treats a replayed refresh token as theft and ends the whole session', async () => {
    const session = await signUp();
    const rotated = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    // The legitimate, newer token of the same family is revoked too.
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it('logout revokes the refresh token and always answers 200', async () => {
    const session = await signUp();
    await http()
      .post('/api/auth/logout')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await http()
      .post('/api/auth/logout')
      .send({ refreshToken: 'bilinmeyen' })
      .expect(200);
  });
});

describe('account deletion', () => {
  it('anonymizes the account and ends every session', async () => {
    const session = await signUp();
    const res = await http()
      .delete(`/api/user/delete/${session.user.id}`)
      .set(bearer(session.token))
      .expect(200);
    responseSchemas.DELETE_ACCOUNT.parse(res.body);

    await http()
      .post('/api/user/login')
      .send({ email: session.user.email, password: PASSWORD })
      .expect(401);
    // The access token is still valid for a few minutes, but the account is
    // gone: 404 makes the app log out.
    await http()
      .get(`/api/user/${session.user.id}`)
      .set(bearer(session.token))
      .expect(404);
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);

    const row = await app
      .get(PrismaService)
      .user.findUniqueOrThrow({ where: { id: session.user.id } });
    expect(row).toMatchObject({ phoneNumber: null, location: null });
    expect(row.email).not.toBe(session.user.email);
    expect(row.anonymizedAt).not.toBeNull();
  });

  it('frees the e-mail address for a new account', async () => {
    const session = await signUp();
    await http()
      .delete(`/api/user/delete/${session.user.id}`)
      .set(bearer(session.token))
      .expect(200);
    await http()
      .post('/api/user/create')
      .send({
        name: 'Yeni Hesap',
        email: session.user.email,
        password: PASSWORD,
      })
      .expect(200);
  });
});
