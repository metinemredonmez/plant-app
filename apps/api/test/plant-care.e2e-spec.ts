import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import sharp from 'sharp';
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

const solid = (r: number, g: number, b: number, width = 64) =>
  sharp({
    create: { width, height: 48, channels: 3, background: { r, g, b } },
  })
    .jpeg()
    .toBuffer();

// Green photos of different sizes: the same photo twice would be a duplicate.
let photos: Buffer[] = [];
let used = 0;
const photo = () => photos[used++ % photos.length];
const SECRET = 'Bearer e2e-revenuecat-webhook-secret';

async function consent(session: Session) {
  await http()
    .post('/api/v1/my/consents')
    .set(bearer(session.token))
    .send({ kind: 'AI_PROCESSING', granted: true, textVersion: '2026-10-25' })
    .expect(201);
}

const identify = (session: Session, image = photo()) =>
  http()
    .post('/api/v1/scans/identify')
    .set(bearer(session.token))
    .attach('image', image, {
      filename: 'yaprak.jpg',
      contentType: 'image/jpeg',
    });

const profile = async (session: Session) =>
  (await http().get('/api/v1/me').set(bearer(session.token)).expect(200)).body;

async function speciesId(scientificName: string) {
  return (
    await prisma.plantSpecies.findUniqueOrThrow({ where: { scientificName } })
  ).id;
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
  photos = await Promise.all(
    Array.from({ length: 60 }, (_, i) => solid(30, 140, 50, 64 + i)),
  );
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

  it('fits the interval to the pot and gives placement tips', async () => {
    const user = await signUp(app);
    const created = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({
        speciesId: await speciesId('Monstera deliciosa'),
        nickname: 'Balkondaki',
        spot: 'BALCONY',
        light: 'LOW',
        pot: 'TERRACOTTA',
      })
      .expect(201);
    // Winter in Istanbul (October-March) or summer, terracotta dries faster.
    const winter = ![3, 4, 5, 6, 7, 8].includes(
      new Date(Date.now() + 3 * 3_600_000).getUTCMonth(),
    );
    expect(created.body).toMatchObject({
      light: 'LOW',
      pot: 'TERRACOTTA',
      wateringIntervalCustom: false,
      wateringIntervalDays: winter ? 11 : 4,
    });

    const detail = await http()
      .get(`/api/v1/my/plants/${created.body.id}`)
      .set(bearer(user.token))
      .expect(200);
    expect(detail.body.tips).toEqual([
      expect.stringContaining('parlak, dolaylı ışık ister'),
      expect.stringContaining('iç mekân için önerilir'),
      expect.stringContaining("15 °C'nin altına düşmeden içeri al"),
    ]);

    const custom = await http()
      .patch(`/api/v1/my/plants/${created.body.id}`)
      .set(bearer(user.token))
      .send({ wateringIntervalDays: 5, light: 'BRIGHT_INDIRECT' })
      .expect(200);
    expect(custom.body).toMatchObject({
      wateringIntervalDays: 5,
      wateringIntervalCustom: true,
    });
    const automatic = await http()
      .patch(`/api/v1/my/plants/${created.body.id}`)
      .set(bearer(user.token))
      .send({ wateringIntervalDays: null })
      .expect(200);
    expect(automatic.body).toMatchObject({
      wateringIntervalDays: created.body.wateringIntervalDays,
      wateringIntervalCustom: false,
    });
  });

  it('schedules waterings by day, overdue ones today', async () => {
    const user = await signUp(app);
    const thirsty = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({ nickname: 'Susuz', wateringIntervalDays: 3 })
      .expect(201);
    await http()
      .post(`/api/v1/my/plants/${thirsty.body.id}/care`)
      .set(bearer(user.token))
      .send({
        kind: 'WATER',
        at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      })
      .expect(201);
    await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({ nickname: 'Yeni', wateringIntervalDays: 3 })
      .expect(201);

    const res = await http()
      .get('/api/v1/my/schedule?days=7')
      .set(bearer(user.token))
      .expect(200);
    expect(res.body.reminderMinute).toBe(540);
    const dates = res.body.days.map((d: { date: string }) => d.date);
    expect(new Set(dates).size).toBe(dates.length);
    const todayIstanbul = new Date(Date.now() + 3 * 3_600_000)
      .toISOString()
      .slice(0, 10);
    expect(res.body.days[0]).toMatchObject({
      date: todayIstanbul,
      plants: [{ id: thirsty.body.id, nickname: 'Susuz', overdue: true }],
    });
    const visits = res.body.days.flatMap(
      (d: { plants: { nickname: string }[] }) =>
        d.plants.map((p) => p.nickname),
    );
    // Today, +3 and +6 for the overdue one; +3 and +6 for the new one.
    expect(visits.filter((n: string) => n === 'Susuz')).toHaveLength(3);
    expect(visits.filter((n: string) => n === 'Yeni')).toHaveLength(2);

    await http()
      .get('/api/v1/my/schedule?days=40')
      .set(bearer(user.token))
      .expect(422);
  });

  it('keeps the city and the reminder time', async () => {
    const cities = await http().get('/api/v1/cities').expect(200);
    expect(cities.body).toHaveLength(81);
    expect(cities.body).toContain('Şanlıurfa');

    const user = await signUp(app);
    await http()
      .patch('/api/v1/me')
      .set(bearer(user.token))
      .send({ city: 'İzmir', reminderMinute: 480 })
      .expect(200);
    expect(await profile(user)).toMatchObject({
      city: 'İzmir',
      reminderMinute: 480,
    });
    await http()
      .patch('/api/v1/me')
      .set(bearer(user.token))
      .send({ city: 'Atlantis' })
      .expect(422);
    await http()
      .patch('/api/v1/me')
      .set(bearer(user.token))
      .send({ reminderMinute: 1440 })
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
    const broken = await http()
      .post('/api/v1/scans/identify')
      .set(bearer(user.token))
      .attach('image', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]), {
        filename: 'bozuk.jpg',
        contentType: 'image/jpeg',
      })
      .expect(422);
    expect(broken.body.message).toContain('okunamadı');

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

  it('answers the same photo again without the provider or the quota', async () => {
    const user = await signUp(app);
    await consent(user);
    const image = photo();
    const spy = vi.spyOn(app.get(VisionProvider), 'identify');
    const first = await identify(user, image).expect(201);
    const again = await identify(user, image).expect(201);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();

    expect(first.body.duplicate).toBe(false);
    expect(again.body).toMatchObject({
      duplicate: true,
      scanId: first.body.scanId,
      outcome: 'identified',
      card: { name: 'Deve tabanı' },
    });
    expect(await prisma.scan.count({ where: { userId: user.user.id } })).toBe(
      1,
    );
    expect((await profile(user)).used.identifyWeek).toBe(1);
  });

  it('says "not recognized" with photo tips and does not use the quota', async () => {
    const user = await signUp(app);
    await consent(user);
    const res = await identify(user, await solid(128, 128, 128)).expect(201);
    expect(res.body).toMatchObject({
      outcome: 'not_recognized',
      isPlant: false,
      confident: false,
      suggestions: [],
      hint: 'Fotoğrafta bir bitki göremedim.',
      card: null,
    });
    expect(res.body.tips.length).toBeGreaterThan(2);
    const { used } = await profile(user);
    expect(used.identifyWeek).toBe(0);
    expect(used.scansToday).toBe(1);
  });

  it('lists possible species between the thresholds', async () => {
    const user = await signUp(app);
    await consent(user);
    const spy = vi
      .spyOn(app.get(VisionProvider), 'identify')
      .mockResolvedValueOnce({
        isPlant: true,
        suggestions: [
          {
            scientificName: 'Ficus elastica',
            commonNames: [],
            probability: 0.41,
          },
          {
            scientificName: 'Ficus lyrata',
            commonNames: [],
            probability: 0.22,
          },
          {
            scientificName: 'Ficus benjamina',
            commonNames: [],
            probability: 0.12,
          },
          {
            scientificName: 'Ficus pumila',
            commonNames: [],
            probability: 0.05,
          },
        ],
      });
    const res = await identify(user).expect(201);
    spy.mockRestore();
    expect(res.body).toMatchObject({
      outcome: 'possible',
      confident: false,
      card: null,
    });
    expect(res.body.suggestions).toHaveLength(3);
    expect(res.body.suggestions[0]).toMatchObject({
      name: 'Kauçuk ağacı',
      speciesId: expect.any(Number),
    });
    expect(res.body.hint).toContain('ikinci bir fotoğraf');
    expect((await profile(user)).used.identifyWeek).toBe(1);
  });

  it('names species without a care card from Wikidata, then the provider', async () => {
    const user = await signUp(app);
    await consent(user);
    const spy = vi
      .spyOn(app.get(VisionProvider), 'identify')
      .mockResolvedValueOnce({
        isPlant: true,
        suggestions: [
          {
            scientificName: 'Nerium oleander',
            commonNames: ['Oleander'],
            probability: 0.88,
          },
          {
            scientificName: 'Plantus imaginarius',
            commonNames: ['Hayali bitki'],
            probability: 0.05,
          },
          {
            scientificName: 'Plantus latinus',
            commonNames: [],
            probability: 0.02,
          },
        ],
      });
    const res = await identify(user).expect(201);
    spy.mockRestore();
    expect(res.body).toMatchObject({ outcome: 'identified', card: null });
    expect(res.body.suggestions.map((s: { name: string }) => s.name)).toEqual([
      'Zakkum',
      'Hayali bitki',
      'Plantus latinus',
    ]);
    expect(res.body.suggestions[0].speciesId).toBeNull();
  });

  it('stores the photo without EXIF or GPS', async () => {
    const user = await signUp(app);
    await consent(user);
    const withGps = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 30, g: 160, b: 40 },
      },
    })
      .withExif({
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '41/1 0/1 54/1',
          GPSLongitudeRef: 'E',
          GPSLongitude: '28/1 58/1 34/1',
        },
      })
      .jpeg()
      .toBuffer();
    const res = await identify(user, withGps).expect(201);
    const scan = await prisma.scan.findUniqueOrThrow({
      where: { id: res.body.scanId },
    });
    const stored = await sharp(
      join(process.env.UPLOAD_DIR!, scan.imageKey),
    ).metadata();
    expect(stored.exif).toBeUndefined();
    expect(stored.format).toBe('jpeg');
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
      .attach('image', photo(), {
        filename: 'y.jpg',
        contentType: 'image/jpeg',
      })
      .expect(404);

    const res = await http()
      .post('/api/v1/scans/diagnose')
      .set(bearer(owner.token))
      .field('userPlantId', String(plant.body.id))
      .attach('image', photo(), {
        filename: 'y.jpg',
        contentType: 'image/jpeg',
      })
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
      .attach('image', photo(), {
        filename: 'y.jpg',
        contentType: 'image/jpeg',
      })
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
