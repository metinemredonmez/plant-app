import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { istanbulDate } from '../src/care/season.js';
import { SpendAlarmService } from '../src/costs/spend-alarm.service.js';
import type { Role } from '../src/generated/prisma/client.js';
import { Outbox } from '../src/messaging/outbox.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';
import { bearer, login, PASSWORD, type Session, signUp } from './helpers.js';

let app: NestExpressApplication;
let prisma: PrismaService;
const http = () => request(app.getHttpServer());

/** A fresh account with a role; the role travels in the access token. */
async function member(role: Role) {
  const session = await signUp(app, role === 'ADMIN' ? 'Sahip' : 'Uzman');
  await prisma.user.update({ where: { id: session.user.id }, data: { role } });
  return login(app, { email: session.user.email, password: PASSWORD });
}

let counter = 0;
// Unique per run: the test database keeps earlier runs' cards.
const card = (overrides: Record<string, unknown> = {}) => ({
  scientificName: `Testia e2e${Date.now()}${++counter}`,
  turkishName: `Deneme çiçeği ${Date.now()}-${counter}`,
  otherNames: ['Sınama otu'],
  synonyms: [],
  family: 'Testaceae',
  light: 'BRIGHT_INDIRECT',
  difficulty: 'EASY',
  waterSummerDays: 5,
  waterWinterDays: 10,
  humidity: 'orta',
  tempMinC: 5,
  tempMaxC: 32,
  toxicToPets: false,
  toxicityNote: null,
  summary: 'Balkonda da yetişen, kolay bakımlı bir deneme bitkisi.',
  wateringTip: 'Toprağın üstü kuruyunca sulayın.',
  lightTip: 'Sabah güneşi alan bir yer iyi gelir.',
  fertilizingTip: 'Büyüme döneminde ayda bir sıvı gübre verin.',
  commonProblems: ['Sararan yapraklar: fazla sulama.'],
  spots: ['INDOOR', 'BALCONY'],
  source: 'Uzman: e2e testi',
  ...overrides,
});

const audits = (action: string, targetId: number) =>
  prisma.auditLog.findMany({
    where: { action, targetId: String(targetId) },
  });

let admin: Session;
let staff: Session;
let customer: Session;

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
  [admin, staff, customer] = await Promise.all([
    member('ADMIN'),
    member('STAFF'),
    signUp(app),
  ]);
});

afterAll(async () => {
  await app.close();
});

describe('admin access', () => {
  it('turns customers away and keeps people, costs and audit for the owner', async () => {
    for (const path of [
      'me',
      'overview',
      'species',
      'reports',
      'users',
      'costs',
      'audit',
    ]) {
      await http()
        .get(`/api/v1/admin/${path}`)
        .set(bearer(customer.token))
        .expect(403);
    }
    await http().get('/api/v1/admin/me').expect(401);

    const me = await http()
      .get('/api/v1/admin/me')
      .set(bearer(staff.token))
      .expect(200);
    expect(me.body).toMatchObject({ role: 'STAFF', email: staff.user.email });
    await http()
      .get('/api/v1/admin/species')
      .set(bearer(staff.token))
      .expect(200);
    await http()
      .get('/api/v1/admin/reports')
      .set(bearer(staff.token))
      .expect(200);
    for (const path of ['users', 'costs', 'audit']) {
      await http()
        .get(`/api/v1/admin/${path}`)
        .set(bearer(staff.token))
        .expect(403);
    }
    await http()
      .get('/api/v1/admin/overview')
      .set(bearer(admin.token))
      .expect(200);
  });
});

describe('care cards', () => {
  it('adds a species the app shows at once, with an audit entry', async () => {
    const body = card();
    const created = await http()
      .post('/api/v1/admin/species')
      .set(bearer(admin.token))
      .send(body)
      .expect(201);
    expect(created.body).toMatchObject({
      status: 'PUBLISHED',
      reviewed: false,
    });

    const found = await http()
      .get(`/api/v1/species?q=${encodeURIComponent(body.turkishName)}`)
      .expect(200);
    expect(found.body).toEqual([
      expect.objectContaining({ id: created.body.id, name: body.turkishName }),
    ]);
    expect(await audits('species.create', created.body.id)).toEqual([
      expect.objectContaining({ actorEmail: admin.user.email }),
    ]);

    await http()
      .post('/api/v1/admin/species')
      .set(bearer(admin.token))
      .send({ ...body, turkishName: 'Başka' })
      .expect(409);

    // A patch changes only what it names; the lists stay.
    const patched = await http()
      .patch(`/api/v1/admin/species/${created.body.id}`)
      .set(bearer(staff.token))
      .send({ turkishName: `${body.turkishName} güncel` })
      .expect(200);
    expect(patched.body).toMatchObject({
      turkishName: `${body.turkishName} güncel`,
      otherNames: ['Sınama otu'],
      commonProblems: ['Sararan yapraklar: fazla sulama.'],
    });
    expect(await audits('species.update', created.body.id)).toHaveLength(1);
    await http()
      .patch(`/api/v1/admin/species/${created.body.id}`)
      .set(bearer(staff.token))
      .send({ tempMaxC: 2 })
      .expect(422);
  });

  it('refuses product names, doses and schedules on a card', async () => {
    const res = await http()
      .post('/api/v1/admin/species')
      .set(bearer(admin.token))
      .send(
        card({
          wateringTip: 'Toprak kuruyunca sulayın.',
          commonProblems: ['Yaprak biti: Confidor ile 7 günde bir ilaçlayın.'],
        }),
      )
      .expect(422);
    expect(res.body.message).toContain('Sık sorunlar');
  });

  it('keeps a model draft out of the app until an expert approves it', async () => {
    const scientificName = `Draftia e2e${Date.now()}`;
    const drafted = await http()
      .post('/api/v1/admin/species/drafts')
      .set(bearer(staff.token))
      .send({ scientificName })
      .expect(201);
    expect(drafted.body).toMatchObject({
      status: 'DRAFT',
      reviewed: false,
      scientificName,
      // The careless line about a product is gone.
      commonProblems: ['Sararan alt yapraklar: fazla sulama.'],
    });
    expect(drafted.body.source).toContain('uzman onayı bekliyor');
    expect(
      await prisma.aiUsage.count({
        where: { task: 'CARD_DRAFT', userId: staff.user.id },
      }),
    ).toBe(1);

    await http().get(`/api/v1/species/${drafted.body.id}`).expect(404);
    const hidden = await http()
      .get(`/api/v1/species?q=${encodeURIComponent(scientificName)}`)
      .expect(200);
    expect(hidden.body).toEqual([]);

    const approved = await http()
      .post(`/api/v1/admin/species/${drafted.body.id}/approve`)
      .set(bearer(staff.token))
      .expect(200);
    expect(approved.body).toMatchObject({
      status: 'PUBLISHED',
      reviewed: true,
      reviewedById: staff.user.id,
    });
    await http().get(`/api/v1/species/${drafted.body.id}`).expect(200);
    expect(await audits('species.draft', drafted.body.id)).toHaveLength(1);
    expect(await audits('species.approve', drafted.body.id)).toHaveLength(1);

    const drafts = await http()
      .get('/api/v1/admin/species?status=DRAFT')
      .set(bearer(staff.token))
      .expect(200);
    expect(drafts.body.map((s: { id: number }) => s.id)).not.toContain(
      drafted.body.id,
    );
  });
});

describe('reported answers', () => {
  it('shows the question with the answer and closes the report', async () => {
    const user = await signUp(app);
    await http()
      .post('/api/v1/my/consents')
      .set(bearer(user.token))
      .send({ kind: 'AI_PROCESSING', granted: true, textVersion: '2026-10-25' })
      .expect(201);
    const asked = await http()
      .post('/api/v1/assistant/messages')
      .set(bearer(user.token))
      .send({ message: 'Yapraklar neden kıvrılır?' })
      .expect(201);
    await http()
      .post(`/api/v1/assistant/messages/${asked.body.reply.id}/report`)
      .set(bearer(user.token))
      .send({ reason: 'WRONG', note: 'Işıktan söz etmedi' })
      .expect(200);

    const open = await http()
      .get('/api/v1/admin/reports')
      .set(bearer(staff.token))
      .expect(200);
    const report = open.body.find(
      (r: { id: number }) => r.id === asked.body.reply.id,
    );
    expect(report).toMatchObject({
      question: 'Yapraklar neden kıvrılır?',
      reason: 'WRONG',
      note: 'Işıktan söz etmedi',
      resolvedAt: null,
    });

    await http()
      .post(`/api/v1/admin/reports/${report.id}/resolve`)
      .set(bearer(staff.token))
      .send({ resolution: 'İstemde ışık vurgusu artırıldı.' })
      .expect(200);
    const closed = await http()
      .get('/api/v1/admin/reports?state=closed')
      .set(bearer(staff.token))
      .expect(200);
    expect(closed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: report.id,
          resolution: 'İstemde ışık vurgusu artırıldı.',
        }),
      ]),
    );
    expect(await audits('report.resolve', report.id)).toHaveLength(1);
  });
});

describe('people', () => {
  it('finds a customer, shows the subscription read-only and anonymizes', async () => {
    const user = await signUp(app, 'Bulunacak Kişi');
    const found = await http()
      .get(`/api/v1/admin/users?q=${encodeURIComponent(user.user.email)}`)
      .set(bearer(admin.token))
      .expect(200);
    expect(found.body).toEqual([
      expect.objectContaining({
        id: user.user.id,
        email: user.user.email,
        premium: false,
      }),
    ]);
    // Searching arbitrary text never hits the uuid column wrongly.
    await http()
      .get('/api/v1/admin/users?q=not-a-uuid')
      .set(bearer(admin.token))
      .expect(200);

    const detail = await http()
      .get(`/api/v1/admin/users/${user.user.id}`)
      .set(bearer(admin.token))
      .expect(200);
    expect(detail.body).toMatchObject({
      subscription: null,
      counts: { plants: 0, scans: 0, messages: 0 },
    });

    await http()
      .post(`/api/v1/admin/users/${admin.user.id}/anonymize`)
      .set(bearer(admin.token))
      .expect(422);
    await http()
      .post(`/api/v1/admin/users/${user.user.id}/anonymize`)
      .set(bearer(admin.token))
      .expect(200);
    const gone = await prisma.user.findUniqueOrThrow({
      where: { id: user.user.id },
    });
    expect(gone.anonymizedAt).not.toBeNull();
    expect(gone.email).not.toBe(user.user.email);
    expect(await audits('user.anonymize', user.user.id)).toHaveLength(1);
    await http()
      .post('/api/user/login')
      .send({ email: user.user.email, password: PASSWORD })
      .expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
  });
});

describe('costs and the spend alarm', () => {
  it('sums the day and e-mails the owner once when the limit is passed', async () => {
    const today = istanbulDate(new Date());
    await prisma.spendAlert.deleteMany({ where: { day: today } });
    const alarm = app.get(SpendAlarmService);
    const outbox = app.get(Outbox);

    const row = await prisma.aiUsage.create({
      data: {
        task: 'ASSISTANT',
        provider: 'anthropic',
        model: 'claude-opus-5-5',
        costUsd: 25,
      },
    });
    try {
      const costs = await http()
        .get('/api/v1/admin/costs?days=7')
        .set(bearer(admin.token))
        .expect(200);
      expect(costs.body.todayUsd).toBeGreaterThanOrEqual(25);
      expect(costs.body.limitUsd).toBe(20);
      expect(costs.body.days[0]).toMatchObject({ day: today });
      expect(costs.body.days[0].tasks.ASSISTANT.costUsd).toBeGreaterThanOrEqual(
        25,
      );

      expect(await alarm.check()).toBe(true);
      expect(outbox.latestTo('sahip@everbloom.test')).toMatchObject({
        channel: 'email',
        subject: expect.stringContaining('günlük harcama eşiği aşıldı'),
      });
      expect(await alarm.check()).toBe(false);
    } finally {
      await prisma.aiUsage.delete({ where: { id: row.id } });
    }
  });

  it('records what the assistant and scans cost', async () => {
    const before = await prisma.aiUsage.count({ where: { task: 'ASSISTANT' } });
    const user = await signUp(app);
    await http()
      .post('/api/v1/my/consents')
      .set(bearer(user.token))
      .send({ kind: 'AI_PROCESSING', granted: true, textVersion: '2026-10-25' })
      .expect(201);
    await http()
      .post('/api/v1/assistant/messages')
      .set(bearer(user.token))
      .send({ message: 'Merhaba' })
      .expect(201);
    expect(await prisma.aiUsage.count({ where: { task: 'ASSISTANT' } })).toBe(
      before + 1,
    );
  });
});

describe('audit log', () => {
  it('lists every admin write, newest first', async () => {
    const log = await http()
      .get('/api/v1/admin/audit?take=500')
      .set(bearer(admin.token))
      .expect(200);
    const actions = new Set(
      log.body.map((entry: { action: string }) => entry.action),
    );
    for (const action of [
      'species.create',
      'species.update',
      'species.draft',
      'species.approve',
      'report.resolve',
      'user.anonymize',
    ]) {
      expect(actions).toContain(action);
    }
    expect(log.body[0].id).toBeGreaterThan(log.body.at(-1).id);
  });
});
