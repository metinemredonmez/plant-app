import type { NestExpressApplication } from '@nestjs/platform-express';
import sharp from 'sharp';
import request from 'supertest';

import {
  CareAssistant,
  describeContext,
  type PlantContext,
} from '../src/assistant/care-assistant.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';
import { bearer, type Session, signUp } from './helpers.js';

let app: NestExpressApplication;
let prisma: PrismaService;
const http = () => request(app.getHttpServer());

async function consentedUser() {
  const user = await signUp(app);
  await http()
    .post('/api/v1/my/consents')
    .set(bearer(user.token))
    .send({ kind: 'AI_PROCESSING', granted: true, textVersion: '2026-10-25' })
    .expect(201);
  return user;
}

const ask = (session: Session, body: object) =>
  http()
    .post('/api/v1/assistant/messages')
    .set(bearer(session.token))
    .send(body);

/** What the model was given for the last question. */
function captureContext() {
  const seen: (PlantContext | null)[] = [];
  const assistant = app.get(CareAssistant);
  const reply = assistant.reply.bind(assistant);
  vi.spyOn(assistant, 'reply').mockImplementation(async (history, context) => {
    seen.push(context);
    return reply(history, context);
  });
  return seen;
}

const leaf = (width: number) =>
  sharp({
    create: {
      width,
      height: 48,
      channels: 3,
      background: { r: 40, g: 150, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('assistant context', () => {
  it('knows the plant, its place, last watering, diagnosis, follow-up, city and weather', async () => {
    const user = await consentedUser();
    await http()
      .patch('/api/v1/me')
      .set(bearer(user.token))
      .send({ city: 'İzmir' })
      .expect(200);
    const plant = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({ nickname: 'Limoncuk', spot: 'BALCONY', light: 'DIRECT' })
      .expect(201);
    await http()
      .post(`/api/v1/my/plants/${plant.body.id}/care`)
      .set(bearer(user.token))
      .send({ kind: 'WATER' })
      .expect(201);
    const diagnosis = await http()
      .post('/api/v1/scans/diagnose')
      .set(bearer(user.token))
      .field('userPlantId', String(plant.body.id))
      .attach('image', await leaf(70), {
        filename: 'a.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const followUp = await http()
      .post('/api/v1/scans/diagnose')
      .set(bearer(user.token))
      .field('followUpOf', String(diagnosis.body.scanId))
      .attach('image', await leaf(71), {
        filename: 'b.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    await http()
      .post(`/api/v1/scans/${followUp.body.scanId}/feedback`)
      .set(bearer(user.token))
      .send({ recovery: 'BETTER' })
      .expect(200);

    const seen = captureContext();
    await ask(user, {
      userPlantId: plant.body.id,
      message: 'Bu gece balkonda kalabilir mi?',
    }).expect(201);
    const context = seen.at(-1)!;
    const today = new Date().toISOString().slice(0, 10);
    expect(context).toMatchObject({
      nickname: 'Limoncuk',
      spot: 'balkon, doğrudan güneş',
      lastWateredAt: today,
      city: 'İzmir',
    });
    expect(context.weather).toMatch(/^İzmir: şu an 16 °C.*don riski var\.$/);
    expect(context.lastDiagnosis).toBe(
      `${today}: Aşırı sulama; takip ${today}: fotoğrafa göre değişim yok, sahibine göre daha iyi`,
    );
    const text = describeContext(context);
    expect(text).toMatch(/^Bitki bilgisi:\n/);
    expect(text).toContain('Şehir: İzmir');
    expect(text).toContain('Hava: İzmir:');
  });

  it('gives a chat without a plant the city and weather, and nothing when unknown', async () => {
    const user = await consentedUser();
    const seen = captureContext();
    await ask(user, { message: 'Balkon için ne önerirsin?' }).expect(201);
    expect(seen.at(-1)).toBeNull();

    await http()
      .patch('/api/v1/me')
      .set(bearer(user.token))
      .send({ city: 'Erzurum' })
      .expect(200);
    await ask(user, { message: 'Ya şimdi?' }).expect(201);
    const context = seen.at(-1)!;
    expect(context).toMatchObject({ city: 'Erzurum' });
    expect(context.nickname).toBeUndefined();
    expect(describeContext(context)).toMatch(
      /^Kullanıcı bilgisi:\nŞehir: Erzurum\nHava: Erzurum:/,
    );
  });
});

describe('reporting an answer', () => {
  it('marks the caller’s own answers only, with a reason', async () => {
    const owner = await consentedUser();
    const stranger = await consentedUser();
    const res = await ask(owner, {
      message: 'Yapraklar neden sararır?',
    }).expect(201);
    const answer = res.body.reply;
    expect(answer).toMatchObject({ role: 'ASSISTANT', reportedAt: null });

    const report = (session: Session, id: number, body: object) =>
      http()
        .post(`/api/v1/assistant/messages/${id}/report`)
        .set(bearer(session.token))
        .send(body);
    await report(owner, answer.id, { reason: 'NONSENSE' }).expect(422);
    await report(stranger, answer.id, { reason: 'WRONG' }).expect(404);
    const question = await prisma.chatMessage.findFirstOrThrow({
      where: { userId: owner.user.id, role: 'USER' },
    });
    await report(owner, question.id, { reason: 'WRONG' }).expect(404);

    const done = await report(owner, answer.id, {
      reason: 'UNSAFE',
      note: '  İlaç önerdi  ',
    }).expect(200);
    expect(done.body.reportedAt).toBeTruthy();
    expect(
      await prisma.chatMessage.findUniqueOrThrow({ where: { id: answer.id } }),
    ).toMatchObject({ reportReason: 'UNSAFE', reportNote: 'İlaç önerdi' });

    const history = await http()
      .get('/api/v1/assistant/messages')
      .set(bearer(owner.token))
      .expect(200);
    expect(history.body.at(-1)).toMatchObject({
      id: answer.id,
      reportedAt: done.body.reportedAt,
    });
  });
});
