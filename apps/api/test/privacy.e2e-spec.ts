import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import sharp from 'sharp';
import request from 'supertest';

import type { Role } from '../src/generated/prisma/client.js';
import { Outbox } from '../src/messaging/outbox.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RetentionService } from '../src/privacy/retention.service.js';
import { ProviderDeletionsService } from '../src/scans/provider-deletions.service.js';
import {
  VisionProvider,
  VisionProviderError,
} from '../src/scans/vision-provider.js';
import { createTestApp } from './create-app.js';
import {
  bearer,
  login,
  PASSWORD,
  type Session,
  signUp,
  uniqueEmail,
} from './helpers.js';

let app: NestExpressApplication;
let prisma: PrismaService;
let outbox: Outbox;
const http = () => request(app.getHttpServer());
const DAY = 24 * 60 * 60 * 1000;

let widths = 200;
const photo = () =>
  sharp({
    create: {
      width: widths++,
      height: 48,
      channels: 3,
      background: { r: 40, g: 150, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();

async function member(role: Role) {
  const session = await signUp(app, 'Ekip');
  await prisma.user.update({ where: { id: session.user.id }, data: { role } });
  return login(app, { email: session.user.email, password: PASSWORD });
}

const me = async (session: Session) =>
  (await http().get('/api/v1/me').set(bearer(session.token)).expect(200)).body;

const consent = (session: Session) =>
  http()
    .post('/api/v1/my/consents')
    .set(bearer(session.token))
    .send({ kind: 'AI_PROCESSING', granted: true, textVersion: '2026-10-25' })
    .expect(201);

const identify = async (session: Session) =>
  http()
    .post('/api/v1/scans/identify')
    .set(bearer(session.token))
    .attach('image', await photo(), {
      filename: 'y.jpg',
      contentType: 'image/jpeg',
    })
    .expect(201);

const ask = (session: Session, body: object) =>
  http()
    .post('/api/v1/assistant/messages')
    .set(bearer(session.token))
    .send(body)
    .expect(201);

const publish = (session: Session, slug: string) =>
  http()
    .post(`/api/v1/admin/legal/${slug}`)
    .set(bearer(session.token))
    .send({
      title: 'Yeni sürüm',
      sections: [{ heading: 'Madde', body: 'Güncellenen metin.' }],
      draft: false,
    });

const form = (path: string, body: object) =>
  http().post(path).type('form').send(body);

const codeTo = (address: string) =>
  /(\d{6})/.exec(outbox.latestTo(address)?.text ?? '')?.[1] ?? '';

let owner: Session;

beforeAll(async () => {
  process.env.AUTH_PHONE_ENABLED = 'true';
  process.env.PHONE_PEPPER = 'e2e-phone-pepper-that-is-at-least-32-chars';
  app = await createTestApp();
  prisma = app.get(PrismaService);
  outbox = app.get(Outbox);
  owner = await member('ADMIN');
});

afterAll(async () => {
  delete process.env.AUTH_PHONE_ENABLED;
  delete process.env.PHONE_PEPPER;
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('legal texts', () => {
  it('are public in the API and on the web, with their version', async () => {
    const list = await http().get('/api/v1/legal').expect(200);
    expect(list.body.map((d: { slug: string }) => d.slug).sort()).toEqual([
      'gizlilik',
      'kosullar',
      'kvkk',
      'model-gelistirme',
      'yapay-zeka',
    ]);
    const ai = await http().get('/api/v1/legal/yapay-zeka').expect(200);
    expect(ai.body).toMatchObject({ version: '2026-10-25', draft: true });
    await http().get('/api/v1/legal/yok').expect(404);

    const page = await http().get('/yasal/gizlilik').expect(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.headers['content-security-policy']).toContain(
      "default-src 'none'",
    );
    expect(page.text).toContain('Gizlilik');
    expect(page.text).not.toContain('<script');
    await http().get('/yasal/yok').expect(404);
    await http().get('/yasal').expect(200);
  });

  it('tells the app where the public pages are', async () => {
    const config = await http().get('/api/v1/app-config').expect(200);
    expect(config.body.links).toEqual({
      privacyRequest: 'http://localhost:4100/kvkk-basvuru',
      deleteAccount: 'http://localhost:4100/hesap-silme',
    });
  });

  it('asks for the new terms and notice at the next open, not at sign-up', async () => {
    const user = await signUp(app);
    const fresh = await me(user);
    expect(fresh.pendingLegal).toEqual([]);
    expect(fresh.missingSteps).not.toContain('legal');

    const { version: oldTerms } = (
      await http().get('/api/v1/legal/kosullar').expect(200)
    ).body;
    const terms = await publish(owner, 'kosullar').expect(201);
    const notice = await publish(owner, 'kvkk').expect(201);
    expect(terms.body.version).not.toBe(oldTerms);

    const after = await me(user);
    expect(after.missingSteps[0]).toBe('legal');
    expect(after.pendingLegal).toEqual([
      expect.objectContaining({
        slug: 'kosullar',
        action: 'accept',
        version: terms.body.version,
      }),
      expect.objectContaining({
        slug: 'kvkk',
        action: 'notice',
        version: notice.body.version,
      }),
    ]);

    // Someone signing up now accepts the new versions.
    expect((await me(await signUp(app))).pendingLegal).toEqual([]);

    const accept = (documents: object[]) =>
      http()
        .post('/api/v1/my/legal/accept')
        .set(bearer(user.token))
        .send({ documents });
    const stale = await accept([
      { slug: 'kosullar', version: oldTerms },
    ]).expect(409);
    expect(stale.body.code).toBe('legal_outdated');
    await accept([{ slug: 'yapay-zeka', version: '2026-10-25' }]).expect(422);
    const done = await accept([
      { slug: 'kosullar', version: terms.body.version },
      { slug: 'kvkk', version: notice.body.version },
    ]).expect(200);
    expect(done.body.pending).toEqual([]);
    expect((await me(user)).missingSteps).not.toContain('legal');
  });

  it('asks consents again only of people who had given them', async () => {
    const gave = await signUp(app);
    const never = await signUp(app);
    const { version } = (
      await http().get('/api/v1/legal/model-gelistirme').expect(200)
    ).body;
    // Off by default.
    expect((await me(gave)).modelTraining.granted).toBe(false);
    const grant = await http()
      .post('/api/v1/my/consents')
      .set(bearer(gave.token))
      .send({ kind: 'MODEL_TRAINING', granted: true, textVersion: version })
      .expect(201);
    expect(grant.body.granted).toBe(true);
    expect((await me(gave)).modelTraining.granted).toBe(true);

    const next = await publish(owner, 'model-gelistirme').expect(201);
    const asked = await me(gave);
    expect(asked.modelTraining.granted).toBe(false);
    expect(asked.pendingLegal).toEqual([
      expect.objectContaining({ slug: 'model-gelistirme', action: 'consent' }),
    ]);
    expect((await me(never)).pendingLegal).toEqual([]);

    // Saying no to the new text also closes the question.
    await http()
      .post('/api/v1/my/consents')
      .set(bearer(gave.token))
      .send({
        kind: 'MODEL_TRAINING',
        granted: false,
        textVersion: next.body.version,
      })
      .expect(201);
    expect((await me(gave)).pendingLegal).toEqual([]);
  });

  it('lets only the owner publish, and audits it', async () => {
    const staff = await member('STAFF');
    const customer = await signUp(app);
    await publish(customer, 'gizlilik').expect(403);
    await publish(staff, 'gizlilik').expect(403);
    await publish(owner, 'yok').expect(404);
    const doc = await publish(owner, 'gizlilik').expect(201);
    const entries = await prisma.auditLog.findMany({
      where: { action: 'legal.publish', targetId: 'gizlilik' },
      orderBy: { id: 'desc' },
    });
    expect(entries[0]).toMatchObject({ actorEmail: owner.user.email });
    expect(entries[0].details).toMatchObject({ version: doc.body.version });
    const current = await http().get('/api/v1/legal/gizlilik').expect(200);
    expect(current.body).toMatchObject({
      version: doc.body.version,
      draft: false,
    });
    // Old versions stay.
    const history = await http()
      .get('/api/v1/admin/legal')
      .set(bearer(owner.token))
      .expect(200);
    expect(
      history.body.filter((d: { slug: string }) => d.slug === 'gizlilik')
        .length,
    ).toBeGreaterThan(1);
  });
});

describe('web account deletion', () => {
  it('needs the code and the tick, then clears the photo, scans and chat', async () => {
    const user = await signUp(app, 'Silinecek Kişi');
    await consent(user);
    const forget = vi.spyOn(app.get(VisionProvider), 'forget');
    const scan = await identify(user);
    expect(forget).toHaveBeenCalledTimes(1);
    await ask(user, { message: 'Sararma neden olur?' });
    const { imageKey } = await prisma.scan.findUniqueOrThrow({
      where: { id: scan.body.scanId },
    });
    const file = join(process.env.UPLOAD_DIR!, imageKey!);
    expect(existsSync(file)).toBe(true);

    const start = await http().get('/hesap-silme').expect(200);
    expect(start.text).toContain('Hesabını sil');
    const sent = await form('/hesap-silme', {
      iletisim: user.user.email,
    }).expect(200);
    expect(sent.text).toContain('Kodu gir');
    const code = codeTo(user.user.email);
    expect(code).toHaveLength(6);

    const wrong = await form('/hesap-silme/onay', {
      iletisim: user.user.email,
      kod: code === '000000' ? '111111' : '000000',
      onay: 'evet',
    }).expect(200);
    expect(wrong.text).toContain('role="alert"');
    const unticked = await form('/hesap-silme/onay', {
      iletisim: user.user.email,
      kod: code,
    }).expect(200);
    expect(unticked.text).toContain('kutuyu');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.user.id } }))
        .anonymizedAt,
    ).toBeNull();

    const done = await form('/hesap-silme/onay', {
      iletisim: user.user.email,
      kod: code,
      onay: 'evet',
    }).expect(200);
    expect(done.text).toContain('Talebin işlendi');

    const gone = await prisma.user.findUniqueOrThrow({
      where: { id: user.user.id },
    });
    expect(gone.anonymizedAt).not.toBeNull();
    expect(gone.email).not.toBe(user.user.email);
    expect(existsSync(file)).toBe(false);
    expect(await prisma.scan.count({ where: { userId: user.user.id } })).toBe(
      0,
    );
    expect(
      await prisma.chatMessage.count({ where: { userId: user.user.id } }),
    ).toBe(0);
    // The record holds no address.
    const record = await prisma.privacyRequest.findFirstOrThrow({
      where: { userId: user.user.id },
    });
    expect(record).toMatchObject({
      type: 'DELETE',
      status: 'DONE',
      email: null,
      response: 'Hesap silindi',
    });
    expect(record.contactHint).not.toContain(user.user.email);
    expect(outbox.latestTo(user.user.email)?.subject).toContain('silindi');
    // A code works once.
    const again = await form('/hesap-silme/onay', {
      iletisim: user.user.email,
      kod: code,
      onay: 'evet',
    }).expect(200);
    expect(again.text).toContain('role="alert"');
  });

  it('does not tell whether an account exists', async () => {
    const address = uniqueEmail();
    const sent = await form('/hesap-silme', { iletisim: address }).expect(200);
    expect(sent.text).toContain('Kodu gir');
    const done = await form('/hesap-silme/onay', {
      iletisim: address,
      kod: codeTo(address),
      onay: 'evet',
    }).expect(200);
    expect(done.text).toContain('Bu bilgiyle bir hesap varsa silindi');
  });

  it('works for a phone account and keeps no number', async () => {
    const phone = `+905${String(Date.now()).slice(-9)}`;
    await http().post('/api/v1/auth/phone/code').send({ phone }).expect(200);
    const signedIn = await http()
      .post('/api/v1/auth/phone/verify')
      .send({ phone, code: codeTo(phone) })
      .expect(200);
    const { id } = await me({ token: signedIn.body.token } as Session);
    await prisma.otpCode.updateMany({
      where: { purpose: 'PHONE_LOGIN' },
      data: { createdAt: new Date(Date.now() - 120_000) },
    });

    await form('/hesap-silme', { iletisim: phone }).expect(200);
    await form('/hesap-silme/onay', {
      iletisim: phone,
      kod: codeTo(phone),
      onay: 'evet',
    }).expect(200);
    const gone = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(gone.anonymizedAt).not.toBeNull();
    expect(await prisma.authIdentity.count({ where: { userId: id } })).toBe(0);
    const record = await prisma.privacyRequest.findFirstOrThrow({
      where: { userId: id },
    });
    expect(JSON.stringify(record)).not.toContain(phone.slice(-9));
    expect(record.contactHint).toBe(`•••• ••• •• ${phone.slice(-2)}`);
  });

  it('leaves the team’s accounts to a person', async () => {
    const staff = await member('STAFF');
    await form('/hesap-silme', { iletisim: staff.user.email }).expect(200);
    await form('/hesap-silme/onay', {
      iletisim: staff.user.email,
      kod: codeTo(staff.user.email),
      onay: 'evet',
    }).expect(200);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: staff.user.id } }))
        .anonymizedAt,
    ).toBeNull();
    expect(
      await prisma.privacyRequest.findFirstOrThrow({
        where: { userId: staff.user.id },
      }),
    ).toMatchObject({ status: 'OPEN', type: 'DELETE' });
  });

  it('refuses nonsense, escapes input and sends bots nothing', async () => {
    const bad = await form('/hesap-silme', {
      iletisim: '<script>alert(1)</script>',
    }).expect(200);
    expect(bad.text).toContain('&lt;script&gt;');
    expect(bad.text).not.toContain('<script>');

    const address = uniqueEmail();
    await form('/hesap-silme', {
      iletisim: address,
      web_sitesi: 'spam',
    }).expect(200);
    expect(outbox.latestTo(address)).toBeUndefined();
  });

  it('caps codes per address and answers a quick repeat with the code form', async () => {
    const address = uniqueEmail();
    await form('/hesap-silme', { iletisim: address }).expect(200);
    const repeat = await form('/hesap-silme', { iletisim: address }).expect(
      200,
    );
    expect(repeat.text).toContain('Kodu gir');
    expect(repeat.text).toContain('60 saniye');

    const otps = await prisma.otpCode.findMany({ where: { target: address } });
    await prisma.otpCode.createMany({
      data: Array.from({ length: 5 }, () => ({
        target: address,
        purpose: 'PRIVACY_REQUEST' as const,
        codeHash: otps[0].codeHash,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 3_600_000),
        consumedAt: new Date(),
      })),
    });
    const capped = await form('/hesap-silme', { iletisim: address }).expect(
      200,
    );
    expect(capped.text).toContain('çok kod gönderildi');
  });
});

describe('KVKK form', () => {
  const answers = (eposta: string) => ({
    ad: 'Başvuran Kişi',
    eposta,
    tur: 'ACCESS',
    mesaj: 'Hakkımda hangi verilerin tutulduğunu öğrenmek istiyorum.',
  });

  it('takes a verified request with a 30-day clock, and the owner answers it', async () => {
    const user = await signUp(app);
    const address = user.user.email;
    expect((await http().get('/kvkk-basvuru').expect(200)).text).toContain(
      'KVKK başvurusu',
    );
    const missing = await form('/kvkk-basvuru', {
      ...answers(address),
      mesaj: '',
    }).expect(200);
    expect(missing.text).toContain('açıkla');

    await form('/kvkk-basvuru', answers(address)).expect(200);
    const code = codeTo(address);
    const wrong = await form('/kvkk-basvuru/onay', {
      ...answers(address),
      kod: code === '000000' ? '111111' : '000000',
    }).expect(200);
    expect(wrong.text).toContain('role="alert"');

    const done = await form('/kvkk-basvuru/onay', {
      ...answers(address),
      kod: code,
    }).expect(200);
    const id = Number(/#(\d+)/.exec(done.text)?.[1]);
    const row = await prisma.privacyRequest.findUniqueOrThrow({
      where: { id },
    });
    expect(row).toMatchObject({
      type: 'ACCESS',
      status: 'OPEN',
      email: address,
      userId: user.user.id,
    });
    expect(Math.round((row.dueAt.getTime() - Date.now()) / DAY)).toBe(30);
    expect(outbox.latestTo(address)?.subject).toContain(`#${id}`);
    expect(outbox.latestTo('sahip@everbloom.test')?.subject).toContain(
      `#${id}`,
    );

    const queue = await http()
      .get('/api/v1/admin/privacy-requests')
      .set(bearer(owner.token))
      .expect(200);
    expect(queue.body.map((r: { id: number }) => r.id)).toContain(id);
    const staff = await member('STAFF');
    await http()
      .get('/api/v1/admin/privacy-requests')
      .set(bearer(staff.token))
      .expect(403);
    const overview = await http()
      .get('/api/v1/admin/overview')
      .set(bearer(owner.token))
      .expect(200);
    expect(overview.body.openPrivacy).toBeGreaterThan(0);

    await http()
      .post(`/api/v1/admin/privacy-requests/${id}/respond`)
      .set(bearer(owner.token))
      .send({ status: 'DONE', response: 'Tutulan veriler ektedir.' })
      .expect(200);
    expect(outbox.latestTo(address)).toMatchObject({
      subject: expect.stringContaining('yanıtlandı'),
      text: 'Tutulan veriler ektedir.',
    });
    expect(
      await prisma.auditLog.count({
        where: { action: 'privacy.respond', targetId: String(id) },
      }),
    ).toBe(1);
  });
});

describe('assistant memory', () => {
  it('deletes one plant’s chat or all of them', async () => {
    const user = await signUp(app);
    const stranger = await signUp(app);
    await consent(user);
    const plant = await http()
      .post('/api/v1/my/plants')
      .set(bearer(user.token))
      .send({ nickname: 'Gül' })
      .expect(201);
    await ask(user, { message: 'Genel soru' });
    await ask(user, { userPlantId: plant.body.id, message: 'Gül sorusu' });

    await http()
      .delete(`/api/v1/assistant/messages?userPlantId=${plant.body.id}`)
      .set(bearer(stranger.token))
      .expect(404);
    const one = await http()
      .delete(`/api/v1/assistant/messages?userPlantId=${plant.body.id}`)
      .set(bearer(user.token))
      .expect(200);
    expect(one.body.deleted).toBe(2);
    const count = () =>
      prisma.chatMessage.count({ where: { userId: user.user.id } });
    expect(await count()).toBe(2);
    await http()
      .delete('/api/v1/assistant/messages')
      .set(bearer(user.token))
      .expect(200);
    expect(await count()).toBe(0);
  });
});

describe('provider deletions', () => {
  it('deletes the provider’s copy right away and keeps its token out of results', async () => {
    const user = await signUp(app);
    await consent(user);
    const vision = app.get(VisionProvider);
    const forget = vi.spyOn(vision, 'forget');
    const res = await identify(user);
    expect(forget.mock.calls[0][0]).toMatch(/^fake-/);
    expect(JSON.stringify(res.body)).not.toContain('fake-');
    const diagnosed = await http()
      .post('/api/v1/scans/diagnose')
      .set(bearer(user.token))
      .attach('image', await photo(), {
        filename: 'y.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    expect(forget).toHaveBeenCalledTimes(2);
    const row = await prisma.scan.findUniqueOrThrow({
      where: { id: diagnosed.body.scanId },
    });
    expect(JSON.stringify(row.result)).not.toContain('fake-');
  });

  it('queues a failed delete without holding up the scan, then retries', async () => {
    const user = await signUp(app);
    await consent(user);
    const vision = app.get(VisionProvider);
    const forget = vi
      .spyOn(vision, 'forget')
      .mockRejectedValueOnce(new VisionProviderError('Kindwise HTTP 503'));
    await identify(user);
    const ref = forget.mock.calls[0][0];
    const queued = await prisma.providerDeletion.findFirstOrThrow({
      where: { ref },
    });
    expect(queued).toMatchObject({
      attempts: 1,
      lastError: 'Kindwise HTTP 503',
    });
    expect(queued.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

    const deletions = app.get(ProviderDeletionsService);
    await prisma.providerDeletion.update({
      where: { id: queued.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    forget.mockRejectedValueOnce(new VisionProviderError('Kindwise HTTP 503'));
    await deletions.runDue();
    const retried = await prisma.providerDeletion.findUniqueOrThrow({
      where: { id: queued.id },
    });
    expect(retried.attempts).toBe(2);
    await prisma.providerDeletion.update({
      where: { id: queued.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    await deletions.runDue();
    expect(
      await prisma.providerDeletion.count({ where: { id: queued.id } }),
    ).toBe(0);
  });
});

describe('retention job', () => {
  it('removes old photos and chats, keeps open reports, and runs once a day', async () => {
    const user = await signUp(app);
    await consent(user);
    const oldScan = await identify(user);
    const newScan = await identify(user);
    const old = new Date(Date.now() - 200 * DAY);
    await prisma.scan.update({
      where: { id: oldScan.body.scanId },
      data: { createdAt: old },
    });
    const { imageKey: oldKey } = await prisma.scan.findUniqueOrThrow({
      where: { id: oldScan.body.scanId },
    });
    const { imageKey: newKey } = await prisma.scan.findUniqueOrThrow({
      where: { id: newScan.body.scanId },
    });

    const kept = await ask(user, { message: 'Bildirilecek soru' });
    await http()
      .post(`/api/v1/assistant/messages/${kept.body.reply.id}/report`)
      .set(bearer(user.token))
      .send({ reason: 'WRONG' })
      .expect(200);
    const dropped = await ask(user, { message: 'Eski soru' });
    const veryOld = new Date(Date.now() - 400 * DAY);
    await prisma.chatMessage.updateMany({
      where: { userId: user.user.id },
      data: { createdAt: veryOld },
    });

    const usage = await prisma.aiUsage.create({
      data: {
        task: 'ASSISTANT',
        provider: 'anthropic',
        costUsd: 0,
        userId: user.user.id,
        createdAt: veryOld,
      },
    });
    const near = await prisma.privacyRequest.create({
      data: {
        type: 'ACCESS',
        email: uniqueEmail(),
        contactHint: 'x•••@test',
        dueAt: new Date(Date.now() + 2 * DAY),
      },
    });
    const closed = await prisma.privacyRequest.create({
      data: {
        type: 'ACCESS',
        status: 'DONE',
        contactHint: 'y•••@test',
        dueAt: new Date(Date.now() - 1200 * DAY),
        createdAt: new Date(Date.now() - 1200 * DAY),
      },
    });

    await prisma.jobRun.deleteMany({ where: { name: 'retention' } });
    const job = app.get(RetentionService);
    const result = await job.tick();
    expect(result?.photos).toBeGreaterThanOrEqual(1);

    expect(existsSync(join(process.env.UPLOAD_DIR!, oldKey!))).toBe(false);
    expect(existsSync(join(process.env.UPLOAD_DIR!, newKey!))).toBe(true);
    const purged = await prisma.scan.findUniqueOrThrow({
      where: { id: oldScan.body.scanId },
    });
    // The result stays with the history; only the photo is gone.
    expect(purged.imageKey).toBeNull();
    expect(purged.result).not.toBeNull();

    expect(
      await prisma.chatMessage.count({ where: { id: dropped.body.reply.id } }),
    ).toBe(0);
    expect(
      await prisma.chatMessage.count({ where: { id: kept.body.reply.id } }),
    ).toBe(1);
    expect(
      (await prisma.aiUsage.findUniqueOrThrow({ where: { id: usage.id } }))
        .userId,
    ).toBeNull();
    expect(
      await prisma.privacyRequest.count({ where: { id: closed.id } }),
    ).toBe(0);

    expect(
      (
        await prisma.privacyRequest.findUniqueOrThrow({
          where: { id: near.id },
        })
      ).reminderSentAt,
    ).not.toBeNull();
    expect(outbox.latestTo('sahip@everbloom.test')?.text).toContain(
      `#${near.id}`,
    );

    // Recorded, shown to the owner, and not run again the same day.
    const overview = await http()
      .get('/api/v1/admin/overview')
      .set(bearer(owner.token))
      .expect(200);
    expect(overview.body.retentionLastRunAt).toBeTruthy();
    expect(await job.tick()).toBeNull();
    expect(await job.tick(new Date(Date.now() + DAY))).not.toBeNull();
    await prisma.privacyRequest.delete({ where: { id: near.id } });
  });
});
