import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

export const PASSWORD = 'parola123';
export const DEMO = { email: 'demo@everbloom.test', password: 'demo1234' };

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let counter = 0;
/** Unique per test run and worker, so specs never collide on e-mail. */
export const uniqueEmail = () =>
  `user-${Date.now()}-${process.pid}-${++counter}@everbloom.test`;

/** A fresh Turkish mobile number for phone verification tests. */
export const uniquePhone = () =>
  `+905${String(Date.now() + ++counter).slice(-9)}`;

export interface Session {
  user: { id: number; name: string; email: string };
  token: string;
  refreshToken: string;
}

export async function signUp(
  app: NestExpressApplication,
  name = 'Zeynep Kaya',
): Promise<Session> {
  const res = await request(app.getHttpServer())
    .post('/api/user/create')
    .send({ name, email: uniqueEmail(), password: PASSWORD })
    .expect(200);
  return res.body;
}

export async function login(
  app: NestExpressApplication,
  credentials = DEMO,
): Promise<Session> {
  const res = await request(app.getHttpServer())
    .post('/api/user/login')
    .send(credentials)
    .expect(200);
  return res.body;
}
