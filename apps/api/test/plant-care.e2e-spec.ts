import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { CareAssistant } from '../src/assistant/care-assistant.js';
import { AssistantUnavailableError } from '../src/assistant/care-assistant.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  VisionProvider,
  VisionProviderError,
} from '../src/scans/vision-provider.js';
import { createTestApp } from './create-app.js';
import { bearer, type Session, signUp } from './helpers.js';

let app: NestExpressApplication;
let prisma: PrismaService;
const http = () => request(app.getHttpServer());

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const SECRET = 'Bearer e2e-revenuecat-webhook-secret';

async function consent(session: Session) {
  await http()
    .post('/api/v1/my/consents')
    .set(bearer(session.token))
    .send({ kind: 'AI_PROCESSING', granted: true, textVersion: '2026-10-25' })
    .expect(201);
}

const identify = (session: Session) =>
  http()
    .post('/api/v1/scans/identify')
    .set(bearer(session.token))
    .attach('image', JPEG, {
      filename: 'yaprak.jpg',
      contentType: 'image/jpeg',
    });

async function speciesId(scientificName: string) {
  return (
    await prisma.plantSpecies.findUniqueOrThrow({ where: { scientificName } })
  ).id;
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

describe('species care cards', () => {
  it('are public and searchable in Turkish', async () => {
    const res = await http().get('/api/v1/species?q=sardunya').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      name: 'Sardunya',
      pets: { toxic: true },
      spots: expect.arrayContaining(['BALCONY']),
    });
    expect(res.body[0]).not.toHaveProperty('source');
    await http().get('/api/v1/species/999999').expect(404);
  });
});

describe('my plants', () => {
  it('adds a plant with the card’s watering interval and logs watering', async () => {
    const user = await signUp(app);
    const created = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({
        speciesId: await speciesId('Dracaena trifasciata'),
        nickname: 'Salon kılıcı',
      })
      .expect(201);
    expect([14, 30]).toContain(created.body.wateringIntervalDays);
    expect(created.body.species.name).toBe('Paşa kılıcı');

    const watered = await http()
      .post(`/api/v1/my/plants/${created.body.id}/care`)
      .set(bearer(user.token))
      .send({ kind: 'WATER', note: 'bol su' })
      .expect(201);
    expect(watered.body.plant.watering.lastWateredAt).not.toBeNull();
    expect(watered.body.plant.watering.dueInDays).toBe(
      created.body.wateringIntervalDays,
    );

    const detail = await http()
      .get(`/api/v1/my/plants/${created.body.id}`)
      .set(bearer(user.token))
      .expect(200);
    expect(detail.body.card.name).toBe('Paşa kılıcı');
    expect(detail.body.careEvents[0]).toMatchObject({
      kind: 'WATER',
      note: 'bol su',
    });
  });

  it('lists overdue plants under today and refuses future care dates', async () => {
    const user = await signUp(app);
    const plant = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({
        scientificName: 'Ficus benjamina',
        nickname: 'Benjamin',
        wateringIntervalDays: 3,
      })
      .expect(201);
    expect(plant.body.species).toBeNull();
    await http()
      .post(`/api/v1/my/plants/${plant.body.id}/care`)
      .set(bearer(user.token))
      .send({
        kind: 'WATER',
        at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      })
      .expect(201);
    const today = await http()
      .get('/api/v1/my/today')
      .set(bearer(user.token))
      .expect(200);
    expect(today.body.due.map((p: { id: number }) => p.id)).toContain(
      plant.body.id,
    );

    await http()
      .post(`/api/v1/my/plants/${plant.body.id}/care`)
      .set(bearer(user.token))
      .send({
        kind: 'WATER',
        at: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(422);
  });

  it('limits the free plan to five plants', async () => {
    const user = await signUp(app);
    for (let i = 1; i <= 5; i++) {
      await http()
        .post('/api/v1/my/plants')
        .set(bearer(user.token))
        .send({ nickname: `Bitki ${i}` })
        .expect(201);
    }
    const sixth = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({ nickname: 'Bitki 6' })
      .expect(402);
    expect(sixth.body.code).toBe('quota_exceeded');
  });

  it("hides other users' plants (404) and deletes with the care log", async () => {
    const owner = await signUp(app);
    const stranger = await signUp(app);
    const plant = await http()
      .post('/api/v1/my/plants')
      .set(bearer(owner.token))
      .send({
        nickname: 'Fesleğenim',
        speciesId: await speciesId('Ocimum basilicum'),
        spot: 'BALCONY',
      })
      .expect(201);
    const path = `/api/v1/my/plants/${plant.body.id}`;
    // Built one at a time: supertest closes its server after each request.
    const calls = [
      () => http().get(path),
      () => http().patch(path).send({ nickname: 'Benim' }),
      () => http().post(`${path}/care`).send({ kind: 'WATER' }),
      () => http().delete(path),
    ];
    for (const call of calls) {
      await call().set(bearer(stranger.token)).expect(404);
    }
    await http()
      .delete(`/api/v1/my/plants/${plant.body.id}`)
      .set(bearer(owner.token))
      .expect(200);
    expect(
      await prisma.careEvent.count({ where: { userPlantId: plant.body.id } }),
    ).toBe(0);
  });
});

describe('scans', () => {
  it('needs a session and the AI processing consent', async () => {
    await http().post('/api/v1/scans/identify').expect(401);
    const user = await signUp(app);
    const res = await identify(user).expect(403);
    expect(res.body.code).toBe('consent_required');
    expect(await prisma.scan.count({ where: { userId: user.user.id } })).toBe(
      0,
    );
  });

  it('identifies with a care card and enforces the free weekly limit', async () => {
    const user = await signUp(app);
    await consent(user);
    const first = await identify(user).expect(201);
    expect(first.body).toMatchObject({
      confident: true,
      card: { name: 'Deve tabanı', pets: { toxic: true } },
    });
    expect(first.body.suggestions[0]).toMatchObject({
      scientificName: 'Monstera deliciosa',
      name: 'Deve tabanı',
      speciesId: expect.any(Number),
    });

    await identify(user).expect(201);
    await identify(user).expect(201);
    const fourth = await identify(user).expect(402);
    expect(fourth.body.code).toBe('quota_exceeded');
  });

  it('rejects non-images and does not count provider failures', async () => {
    const user = await signUp(app);
    await consent(user);
    await http()
      .post('/api/v1/scans/identify')
      .set(bearer(user.token))
      .attach('image', Buffer.from('not an image'), {
        filename: 'a.txt',
        contentType: 'text/plain',
      })
      .expect(422);

    const spy = vi
      .spyOn(app.get(VisionProvider), 'identify')
      .mockRejectedValueOnce(new VisionProviderError('down'));
    await identify(user).expect(502);
    spy.mockRestore();
    const me = await http()
      .get('/api/v1/me')
      .set(bearer(user.token))
      .expect(200);
    expect(me.body.used.identifyWeek).toBe(0);
  });

  it('diagnoses without chemical advice and only for my own plant', async () => {
    const owner = await signUp(app);
    const stranger = await signUp(app);
    await consent(owner);
    await consent(stranger);
    const plant = await http()
      .post('/api/v1/my/plants')
      .set(bearer(owner.token))
      .send({
        nickname: 'Monstera',
        speciesId: await speciesId('Monstera deliciosa'),
      })
      .expect(201);

    await http()
      .post('/api/v1/scans/diagnose')
      .set(bearer(stranger.token))
      .field('userPlantId', String(plant.body.id))
      .attach('image', JPEG, { filename: 'y.jpg', contentType: 'image/jpeg' })
      .expect(404);

    const res = await http()
      .post('/api/v1/scans/diagnose')
      .set(bearer(owner.token))
      .field('userPlantId', String(plant.body.id))
      .attach('image', JPEG, { filename: 'y.jpg', contentType: 'image/jpeg' })
      .expect(201);
    expect(res.body.isHealthy).toBe(false);
    expect(res.body.issues[0]).toMatchObject({ localName: 'Aşırı sulama' });
    expect(res.body.issues[0]).not.toHaveProperty('chemical');
    expect(res.body.disclaimer).toContain('ziraat mühendisi');
    expect(res.body.followUpAt).toBeTruthy();

    const detail = await http()
      .get(`/api/v1/my/plants/${plant.body.id}`)
      .set(bearer(owner.token))
      .expect(200);
    expect(detail.body.scans[0].kind).toBe('DIAGNOSE');

    // The free plan has one trial diagnosis.
    const again = await http()
      .post('/api/v1/scans/diagnose')
      .set(bearer(owner.token))
      .attach('image', JPEG, { filename: 'y.jpg', contentType: 'image/jpeg' })
      .expect(402);
    expect(again.body.code).toBe('quota_exceeded');
  });
});

describe('care assistant', () => {
  it('answers with the plant’s context and keeps the history', async () => {
    const user = await signUp(app);
    await http()
      .post('/api/v1/assistant/messages')
      .set(bearer(user.token))
      .send({ message: 'Ne sıklıkla sulamalıyım?' })
      .expect(403);
    await consent(user);
    const plant = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({
        nickname: 'Limoncuk',
        speciesId: await speciesId('Citrus limon'),
        spot: 'BALCONY',
      })
      .expect(201);

    const res = await http()
      .post('/api/v1/assistant/messages')
      .set(bearer(user.token))
      .send({ userPlantId: plant.body.id, message: 'Yaprakları sararıyor' })
      .expect(201);
    expect(res.body.reply).toMatchObject({ role: 'ASSISTANT' });
    expect(res.body.reply.content).toContain('Limoncuk');

    const history = await http()
      .get(`/api/v1/assistant/messages?userPlantId=${plant.body.id}`)
      .set(bearer(user.token))
      .expect(200);
    expect(history.body.map((m: { role: string }) => m.role)).toEqual([
      'USER',
      'ASSISTANT',
    ]);
  });

  it('does not save or count a failed answer', async () => {
    const user = await signUp(app);
    await consent(user);
    const spy = vi
      .spyOn(app.get(CareAssistant), 'reply')
      .mockRejectedValueOnce(new AssistantUnavailableError('down'));
    await http()
      .post('/api/v1/assistant/messages')
      .set(bearer(user.token))
      .send({ message: 'Merhaba' })
      .expect(502);
    spy.mockRestore();
    expect(
      await prisma.chatMessage.count({ where: { userId: user.user.id } }),
    ).toBe(0);
  });
});

describe('subscription (RevenueCat webhook)', () => {
  let eventCounter = 0;
  const event = (
    type: string,
    appUserId: string,
    fields: Record<string, unknown> = {},
  ) => ({
    api_version: '1.0',
    event: {
      id: `e2e-${Date.now()}-${process.pid}-${++eventCounter}`,
      type,
      app_user_id: appUserId,
      product_id: 'premium_yearly',
      entitlement_ids: ['premium'],
      event_timestamp_ms: Date.now(),
      expiration_at_ms: Date.now() + 365 * 86_400_000,
      environment: 'SANDBOX',
      store: 'APP_STORE',
      ...fields,
    },
  });
  const send = (body: object, auth = SECRET) =>
    http()
      .post('/api/v1/billing/revenuecat')
      .set('Authorization', auth)
      .send(body);
  const me = async (user: Session) =>
    (await http().get('/api/v1/me').set(bearer(user.token)).expect(200)).body;

  it('rejects calls without the shared secret', async () => {
    const user = await signUp(app);
    const { publicId } = await me(user);
    await send(event('INITIAL_PURCHASE', publicId), 'Bearer wrong').expect(401);
    expect((await me(user)).plan.premium).toBe(false);
  });

  it('grants premium once per event and ignores older events', async () => {
    const user = await signUp(app);
    const { publicId } = await me(user);
    const purchase = event('INITIAL_PURCHASE', publicId);
    expect((await send(purchase).expect(200)).body.outcome).toBe('applied');
    expect((await send(purchase).expect(200)).body.outcome).toBe('duplicate');

    const after = await me(user);
    expect(after.plan).toMatchObject({
      premium: true,
      status: 'ACTIVE',
      productId: 'premium_yearly',
    });
    expect(after.limits.scansPerDay).toBeGreaterThan(3);

    const stale = event('EXPIRATION', publicId, {
      event_timestamp_ms: Date.now() - 86_400_000,
    });
    expect((await send(stale).expect(200)).body.outcome).toBe('ignored_old');
    expect((await me(user)).plan.premium).toBe(true);

    await send(event('EXPIRATION', publicId)).expect(200);
    expect((await me(user)).plan.premium).toBe(false);
  });

  it('records events for unknown users and moves access on transfer', async () => {
    const unknown = await send(
      event('INITIAL_PURCHASE', '00000000-0000-4000-8000-000000000000'),
    ).expect(200);
    expect(unknown.body.outcome).toBe('unknown_user');

    const from = await signUp(app);
    const to = await signUp(app);
    const fromId = (await me(from)).publicId;
    const toId = (await me(to)).publicId;
    await send(event('INITIAL_PURCHASE', fromId)).expect(200);
    await send(
      event('TRANSFER', fromId, {
        transferred_from: [fromId],
        transferred_to: [toId],
      }),
    ).expect(200);
    expect((await me(from)).plan.premium).toBe(false);
    expect((await me(to)).plan.premium).toBe(true);
  });
});

describe('account deletion', () => {
  it('removes plants, scans with their photos and chats', async () => {
    const user = await signUp(app);
    await consent(user);
    const { publicId } = (
      await http().get('/api/v1/me').set(bearer(user.token)).expect(200)
    ).body;
    await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({
        nickname: 'Kauçuk',
        speciesId: await speciesId('Ficus elastica'),
      })
      .expect(201);
    await identify(user).expect(201);
    await http()
      .post('/api/v1/assistant/messages')
      .set(bearer(user.token))
      .send({ message: 'Merhaba' })
      .expect(201);
    const photos = join(process.env.UPLOAD_DIR!, 'scans', publicId);
    expect(existsSync(photos)).toBe(true);

    await http()
      .delete(`/api/user/delete/${user.user.id}`)
      .set(bearer(user.token))
      .expect(200);
    const where = { where: { userId: user.user.id } };
    expect(await prisma.userPlant.count(where)).toBe(0);
    expect(await prisma.scan.count(where)).toBe(0);
    expect(await prisma.chatMessage.count(where)).toBe(0);
    expect(existsSync(photos)).toBe(false);
  });
});
