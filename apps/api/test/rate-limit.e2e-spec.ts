import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp } from './create-app.js';

// A low limit just for this file; createTestApp imports AppModule lazily,
// so the config sees it.
process.env.AUTH_RATE_LIMIT = '3';

describe('rate limit on auth endpoints (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 {message} once the per-IP login limit is used up', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/user/login')
        .send({ email: 'demo@everbloom.test', password: 'tahmin-123' });
    for (let i = 0; i < 3; i++) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(blocked.body).toEqual({
      message: expect.stringContaining('deneme'),
    });
  });

  it('does not limit the catalog', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer()).get('/api/colors').expect(200);
    }
  });
});
