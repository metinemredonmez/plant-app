import type { NestExpressApplication } from '@nestjs/platform-express';
import sharp from 'sharp';
import request from 'supertest';

import { CareAssistant } from '../src/assistant/care-assistant.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { mentionsExpert, violations } from '../src/safety/plant-protection.js';
import {
  type DiagnoseResult,
  VisionProvider,
} from '../src/scans/vision-provider.js';
import { createTestApp } from './create-app.js';
import { FORBIDDEN, RED_TEAM, UNSAFE_REPLIES } from './fixtures/red-team.js';
import { bearer, type Session, signUp } from './helpers.js';

let app: NestExpressApplication;
let prisma: PrismaService;
const http = () => request(app.getHttpServer());

// Green photos of different sizes: the same photo twice would be a duplicate.
let photos: Buffer[] = [];
let used = 0;
const photo = () => photos[used++ % photos.length];

async function consentedUser() {
  const user = await signUp(app);
  await http()
    .post('/api/v1/my/consents')
    .set(bearer(user.token))
    .send({ kind: 'AI_PROCESSING', granted: true, textVersion: '2026-10-25' })
    .expect(201);
  return user;
}

const diagnose = (session: Session, fields: Record<string, number> = {}) => {
  const req = http().post('/api/v1/scans/diagnose').set(bearer(session.token));
  for (const [key, value] of Object.entries(fields)) {
    req.field(key, String(value));
  }
  return req.attach('image', photo(), {
    filename: 'yaprak.jpg',
    contentType: 'image/jpeg',
  });
};

const feedback = (session: Session, id: number, body: object) =>
  http()
    .post(`/api/v1/scans/${id}/feedback`)
    .set(bearer(session.token))
    .send(body);

const sick = (probability: number, healthy = 0.2): DiagnoseResult => ({
  isPlant: true,
  isHealthy: false,
  healthyProbability: healthy,
  issues: [
    {
      name: 'powdery mildew',
      localName: 'Külleme',
      probability,
      description:
        'Yapraklarda beyaz, un gibi bir tabaka oluşur. Bakır oksiklorür ile 7 günde bir ilaçlayın.',
      biological: [
        'Neem yağını litresine 5 ml olacak şekilde karıştırıp püskürtün.',
        'Hasta yaprakları kesip atın.',
      ],
      prevention: [
        'Bitkiler arasında hava dolaşımı bırakın.',
        'Use a sulfur fungicide every 10 days.',
      ],
    },
  ],
});

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
  photos = await Promise.all(
    Array.from({ length: 40 }, (_, i) =>
      sharp({
        create: {
          width: 64 + i,
          height: 48,
          channels: 3,
          background: { r: 40, g: 150, b: 60 },
        },
      })
        .jpeg()
        .toBuffer(),
    ),
  );
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('diagnosis safety', () => {
  it('drops product names, doses and schedules from the provider text', async () => {
    const user = await consentedUser();
    vi.spyOn(app.get(VisionProvider), 'diagnose').mockResolvedValueOnce(
      sick(0.82),
    );
    const res = await diagnose(user).expect(201);
    const [issue] = res.body.issues;
    expect(issue.description).toBe(
      'Yapraklarda beyaz, un gibi bir tabaka oluşur.',
    );
    expect(issue.biological).toEqual(['Hasta yaprakları kesip atın.']);
    expect(issue.prevention).toEqual([
      'Bitkiler arasında hava dolaşımı bırakın.',
    ]);
    const shown = JSON.stringify(res.body);
    for (const pattern of FORBIDDEN) expect(shown).not.toMatch(pattern);
    expect(res.body.referral).toContain('ziraat mühendisi');
    expect(res.body.referral).toContain('B-Reçete');
    expect(res.body.confident).toBe(true);
    expect(res.body.needsSecondPhoto).toBe(false);
  });
});

describe('second photo', () => {
  it('asks for one when unsure, once and without using the trial', async () => {
    const user = await consentedUser();
    const spy = vi.spyOn(app.get(VisionProvider), 'diagnose');
    spy.mockResolvedValueOnce(sick(0.25));
    const first = await diagnose(user).expect(201);
    expect(first.body).toMatchObject({
      confident: false,
      needsSecondPhoto: true,
    });
    expect(first.body.hint).toContain('ikinci bir fotoğraf');
    expect(first.body.tips.length).toBeGreaterThan(0);

    // The free plan's one trial diagnosis is used; the second photo is not.
    spy.mockResolvedValueOnce(sick(0.3));
    const second = await diagnose(user, {
      secondPhotoOf: first.body.scanId,
    }).expect(201);
    expect(second.body.needsSecondPhoto).toBe(false);
    expect(second.body.hint).toContain('ziraat mühendisine');
    const row = await prisma.scan.findUniqueOrThrow({
      where: { id: second.body.scanId },
    });
    expect(row).toMatchObject({
      parentId: first.body.scanId,
      link: 'SECOND_PHOTO',
      chargeable: false,
    });

    await diagnose(user, { secondPhotoOf: first.body.scanId }).expect(422);
    // A fresh diagnosis is still over the trial.
    await diagnose(user).expect(402);
  });

  it('is not offered after a sure result', async () => {
    const user = await consentedUser();
    vi.spyOn(app.get(VisionProvider), 'diagnose').mockResolvedValueOnce(
      sick(0.9),
    );
    const first = await diagnose(user).expect(201);
    await diagnose(user, { secondPhotoOf: first.body.scanId }).expect(422);
  });
});

describe('follow-up', () => {
  it('ties the photo to the diagnosis, compares and takes the owner’s view', async () => {
    const owner = await consentedUser();
    const stranger = await consentedUser();
    const plant = await http()
      .post('/api/v1/my/plants')
      .set(bearer(owner.token))
      .send({ nickname: 'Gül' })
      .expect(201);
    const spy = vi.spyOn(app.get(VisionProvider), 'diagnose');
    spy.mockResolvedValueOnce(sick(0.8, 0.2));
    const first = await diagnose(owner, { userPlantId: plant.body.id }).expect(
      201,
    );
    expect(first.body.followUpAt).toBeTruthy();
    const days =
      (Date.parse(first.body.followUpAt) - Date.now()) / (24 * 3600 * 1000);
    expect(Math.round(days)).toBe(5);

    await diagnose(stranger, { followUpOf: first.body.scanId }).expect(404);

    spy.mockResolvedValueOnce(sick(0.5, 0.55));
    const better = await diagnose(owner, {
      followUpOf: first.body.scanId,
    }).expect(201);
    expect(better.body.followUp).toMatchObject({
      trend: 'better',
      before: { healthyProbability: 0.2, issue: 'Külleme' },
    });
    expect(better.body.hint).toContain('toparlanıyor');
    expect(better.body.followUpAt).toBeNull();
    const row = await prisma.scan.findUniqueOrThrow({
      where: { id: better.body.scanId },
    });
    expect(row).toMatchObject({
      parentId: first.body.scanId,
      link: 'FOLLOW_UP',
      userPlantId: plant.body.id,
      chargeable: false,
    });

    spy.mockResolvedValueOnce(sick(0.9, 0.05));
    const worse = await diagnose(owner, {
      followUpOf: better.body.scanId,
    }).expect(201);
    expect(worse.body.followUp.trend).toBe('worse');
    expect(worse.body.hint).toContain('ziraat mühendisine');
    await diagnose(owner, { followUpOf: first.body.scanId }).expect(422);

    await feedback(owner, better.body.scanId, { recovery: 'BETTER' }).expect(
      200,
    );
    await feedback(owner, first.body.scanId, { correct: true }).expect(200);
    await feedback(owner, first.body.scanId, { recovery: 'SAME' }).expect(422);
    await feedback(owner, better.body.scanId, { correct: false }).expect(422);
    await feedback(owner, first.body.scanId, {}).expect(422);
    await feedback(stranger, first.body.scanId, { correct: false }).expect(404);

    const detail = await http()
      .get(`/api/v1/my/plants/${plant.body.id}`)
      .set(bearer(owner.token))
      .expect(200);
    expect(detail.body.scans).toEqual([
      expect.objectContaining({ id: worse.body.scanId, link: 'FOLLOW_UP' }),
      expect.objectContaining({
        id: better.body.scanId,
        recovery: 'BETTER',
        parentId: first.body.scanId,
      }),
      expect.objectContaining({
        id: first.body.scanId,
        correct: true,
        link: null,
      }),
    ]);
  });

  it('needs a diagnosis that found a problem', async () => {
    const user = await consentedUser();
    vi.spyOn(app.get(VisionProvider), 'diagnose').mockResolvedValueOnce({
      isPlant: true,
      isHealthy: true,
      healthyProbability: 0.92,
      issues: [],
    });
    const healthy = await diagnose(user).expect(201);
    expect(healthy.body.followUpAt).toBeNull();
    await diagnose(user, { followUpOf: healthy.body.scanId }).expect(422);
    await diagnose(user, {
      followUpOf: healthy.body.scanId,
      secondPhotoOf: healthy.body.scanId,
    }).expect(422);
  });
});

describe('assistant red-team set', () => {
  it('lets no product name, dose or schedule through for the 50 prompts', async () => {
    expect(RED_TEAM).toHaveLength(50);
    const user = await consentedUser();
    // Premium: the free plan has 10 questions a month.
    await prisma.entitlement.create({
      data: {
        userId: user.user.id,
        status: 'ACTIVE',
        productId: 'premium_yearly',
        store: 'PROMOTIONAL',
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        lastEventAt: new Date(),
      },
    });
    // A careless model: every answer names a product, a dose or a schedule.
    let turn = 0;
    vi.spyOn(app.get(CareAssistant), 'reply').mockImplementation(async () => ({
      text: UNSAFE_REPLIES[turn++ % UNSAFE_REPLIES.length],
    }));

    for (const { prompt } of RED_TEAM) {
      const res = await http()
        .post('/api/v1/assistant/messages')
        .set(bearer(user.token))
        .send({ message: prompt })
        .expect(201);
      const reply: string = res.body.reply.content;
      for (const pattern of FORBIDDEN)
        expect(reply, prompt).not.toMatch(pattern);
      expect(violations(reply), prompt).toEqual([]);
      expect(mentionsExpert(reply), prompt).toBe(true);
    }

    // What was stored is what was shown.
    const stored = await prisma.chatMessage.findMany({
      where: { userId: user.user.id, role: 'ASSISTANT' },
    });
    expect(stored).toHaveLength(50);
    for (const row of stored) expect(violations(row.content)).toEqual([]);
  });
});
