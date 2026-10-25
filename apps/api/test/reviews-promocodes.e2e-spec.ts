import { responseSchemas } from '@everbloom/contract';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';
import { bearer, login, signUp } from './helpers.js';

let app: NestExpressApplication;
const http = () => request(app.getHttpServer());

async function plantId(name: string) {
  const plant = await app
    .get(PrismaService)
    .plant.findFirstOrThrow({ where: { name } });
  return plant.id;
}

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('reviews', () => {
  it('lists reviews publicly, oldest first, without e-mail and with masked names', async () => {
    const id = await plantId('Monstera Deliciosa 40-50 cm');
    const res = await http().get(`/api/reviews/${id}`).expect(200);
    responseSchemas.GET_REVIEWS.parse(res.body);
    const names = res.body.reviews.map((r: { name: string }) => r.name);
    expect(names).toEqual(['Mert A.', 'Zeynep K.', 'Elif D.']);
  });

  it('only a buyer with a delivered order may review (403 otherwise)', async () => {
    const stranger = await signUp(app);
    const res = await http()
      .post('/api/review/create')
      .set(bearer(stranger.token))
      .send({
        plantId: await plantId('Monstera Deliciosa 40-50 cm'),
        rating: 5,
        comment: 'Hiç almadım ama',
      })
      .expect(403);
    expect(res.body.message).toContain('teslim');
  });

  it('a shipped (not yet delivered) order is not enough', async () => {
    // The demo user's Sukulent Seti order is still "shipping".
    const demo = await login(app);
    await http()
      .post('/api/review/create')
      .set(bearer(demo.token))
      .send({
        plantId: await plantId("Sukulent Seti (5'li)"),
        rating: 4,
        comment: 'Henüz gelmedi',
      })
      .expect(403);
  });

  it('creates the review, updates the rating, and allows one per plant', async () => {
    const prisma = app.get(PrismaService);
    const demo = await login(app);
    const id = await plantId('Pothos Golden 25-30 cm');
    // Repeatable: start without the demo user's review.
    await prisma.review.deleteMany({
      where: { userId: demo.user.id, plantId: id },
    });

    const res = await http()
      .post('/api/review/create')
      .set(bearer(demo.token))
      // name and email from the app are ignored.
      .send({
        plantId: id,
        rating: 3,
        comment: 'İdare eder, biraz yavaş büyüyor',
        name: 'Sahte',
        email: 'x@y.z',
      })
      .expect(200);
    responseSchemas.CREATE_REVIEW.parse(res.body);
    expect(res.body.review.name).toBe('Ayse Y.');

    const plant = await prisma.plant.findUniqueOrThrow({ where: { id } });
    expect(plant.ratingCount).toBe(3);
    expect(plant.ratingAvg).toBeCloseTo((5 + 4 + 3) / 3);

    await http()
      .post('/api/review/create')
      .set(bearer(demo.token))
      .send({ plantId: id, rating: 5, comment: 'İkinci yorum denemesi' })
      .expect(409);
  });

  it('rejects an invalid rating or a too short comment (422)', async () => {
    const demo = await login(app);
    const id = await plantId('Pothos Golden 25-30 cm');
    await http()
      .post('/api/review/create')
      .set(bearer(demo.token))
      .send({ plantId: id, rating: 6, comment: 'Çok güzel' })
      .expect(422);
    await http()
      .post('/api/review/create')
      .set(bearer(demo.token))
      .send({ plantId: id, rating: 5, comment: 'iyi' })
      .expect(422);
  });

  it('requires a session to write (401)', async () => {
    await http()
      .post('/api/review/create')
      .send({ plantId: 1, rating: 5, comment: 'Oturumsuz yorum' })
      .expect(401);
  });
});

describe('promocodes', () => {
  const show = (voucher: string, token?: string) => {
    const call = http().post('/api/promocode/show');
    return (token ? call.set(bearer(token)) : call).send({ voucher });
  };

  it('accepts a valid code, case-insensitively', async () => {
    const res = await show('hosgeldin10').expect(200);
    responseSchemas.GET_PROMOCODE.parse(res.body);
    expect(res.body.promocode).toMatchObject({
      code: 'HOSGELDIN10',
      discount: 10,
    });
  });

  it('an expired code gives no discount (404 with the reason)', async () => {
    const res = await show('YAZ15').expect(404);
    expect(res.body.message).toContain('süresi');
  });

  it('a used-up code gives no discount (404 with the reason)', async () => {
    const res = await show('ILK100').expect(404);
    expect(res.body.message).toContain('limit');
  });

  it('a personal code works only for its owner', async () => {
    await show('AYSE15').expect(404);
    const stranger = await signUp(app);
    await show('AYSE15', stranger.token).expect(404);
    const demo = await login(app);
    await show('AYSE15', demo.token).expect(200);
  });

  it('lists personal codes to their owner only', async () => {
    const anonymous = await http().get('/api/promocodes').expect(200);
    const demo = await login(app);
    const own = await http()
      .get('/api/promocodes')
      .set(bearer(demo.token))
      .expect(200);
    const codes = (res: { body: { code: string }[] }) =>
      res.body.map((p) => p.code);
    expect(codes(anonymous)).toEqual(['HOSGELDIN10', 'BITKI20']);
    expect(codes(own)).toEqual(['HOSGELDIN10', 'BITKI20', 'AYSE15']);
  });
});
