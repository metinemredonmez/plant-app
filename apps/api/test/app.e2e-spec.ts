import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp } from './create-app.js';

describe('API (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reaches PostgreSQL through Prisma 7', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      db: 'up',
      prisma: '7.10.1',
    });
  });

  it('health is not served under the api prefix', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(404);
  });

  it('answers every error as {message}, the shape the app reads', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/does-not-exist')
      .expect(404);
    expect(res.body).toEqual({ message: expect.any(String) });
  });

  it('serves local images at /images in development', async () => {
    await request(app.getHttpServer())
      .get('/images/monstera.jpg')
      .expect(200)
      .expect('Content-Type', 'image/jpeg');
  });
});
