import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { istanbulDate } from '../care/season.js';
import type { LegalDocument, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LEGAL_DRAFTS, type LegalSection } from './legal-drafts.js';

export const AI_DOC = 'yapay-zeka';
export const TRAINING_DOC = 'model-gelistirme';

/**
 * What each text asks of a person (ADR 0016). The KVKK notice only informs:
 * it is marked as seen, never as a consent. Consents are asked again only of
 * someone who had given them.
 */
const TRACKED = [
  { slug: 'kosullar', kind: 'TERMS', action: 'accept' },
  { slug: 'kvkk', kind: 'KVKK_NOTICE', action: 'notice' },
  { slug: AI_DOC, kind: 'AI_PROCESSING', action: 'consent' },
  { slug: TRAINING_DOC, kind: 'MODEL_TRAINING', action: 'consent' },
] as const;

export const acceptSchema = z.object({
  documents: z
    .array(
      z.object({
        slug: z.enum(['kosullar', 'kvkk']),
        version: z.string().min(1).max(40),
      }),
    )
    .min(1)
    .max(2),
});
export type AcceptBody = z.output<typeof acceptSchema>;

export const publishSchema = z.object({
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(800).nullable().optional(),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(6000),
      }),
    )
    .min(1)
    .max(40),
  // Still not the lawyer's final text.
  draft: z.boolean(),
});
export type PublishBody = z.output<typeof publishSchema>;

export const toPublicDoc = (doc: LegalDocument) => ({
  slug: doc.slug,
  version: doc.version,
  title: doc.title,
  summary: doc.summary,
  sections: doc.sections as unknown as LegalSection[],
  draft: doc.draft,
  publishedAt: doc.publishedAt,
});

/** Versioned legal texts: the app, the web pages and consents all read these. */
@Injectable()
export class LegalService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** Drafts only for a text that has no version yet. */
  async onModuleInit() {
    const known = await this.prisma.legalDocument.findMany({
      distinct: ['slug'],
      select: { slug: true },
    });
    const missing = LEGAL_DRAFTS.filter(
      (draft) => !known.some((doc) => doc.slug === draft.slug),
    );
    if (missing.length) {
      await this.prisma.legalDocument.createMany({
        data: missing.map((draft) => ({
          ...draft,
          sections: draft.sections as unknown as Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
    }
  }

  /** The current version of every text. */
  currentAll() {
    return this.prisma.legalDocument.findMany({
      distinct: ['slug'],
      orderBy: [{ slug: 'asc' }, { id: 'desc' }],
    });
  }

  async current(slug: string) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { slug },
      orderBy: { id: 'desc' },
    });
    if (!doc) throw new NotFoundException('Metin bulunamadı');
    return doc;
  }

  /** Texts that changed since this person last accepted or saw them. */
  async pendingFor(userId: number) {
    const [docs, latest] = await Promise.all([
      this.currentAll(),
      this.prisma.consent.findMany({
        where: { userId, kind: { in: TRACKED.map((t) => t.kind) } },
        distinct: ['kind'],
        orderBy: [{ kind: 'asc' }, { id: 'desc' }],
      }),
    ]);
    return TRACKED.flatMap(({ slug, kind, action }) => {
      const doc = docs.find((d) => d.slug === slug);
      if (!doc) return [];
      const row = latest.find((c) => c.kind === kind);
      const pending =
        action === 'consent'
          ? !!row?.granted && row.textVersion !== doc.version
          : row?.textVersion !== doc.version;
      return pending
        ? [{ slug, action, version: doc.version, title: doc.title }]
        : [];
    });
  }

  /** Signing up accepts the terms and shows the notice (the "hesap" screen). */
  async recordSignUp(userId: number) {
    const docs = await this.currentAll();
    await this.prisma.consent.createMany({
      data: TRACKED.filter((t) => t.action !== 'consent').flatMap(
        ({ slug, kind }) => {
          const doc = docs.find((d) => d.slug === slug);
          return doc
            ? [{ userId, kind, granted: true, textVersion: doc.version }]
            : [];
        },
      ),
    });
  }

  /** Terms accepted and notice seen, for the exact versions that were shown. */
  async accept(caller: AuthUser, body: AcceptBody) {
    const docs = await this.currentAll();
    const rows = body.documents.map(({ slug, version }) => {
      if (docs.find((d) => d.slug === slug)?.version !== version) {
        throw new ConflictException({
          message: 'Metin güncellendi, lütfen yeniden bak',
          code: 'legal_outdated',
        });
      }
      const kind = TRACKED.find((t) => t.slug === slug)!.kind;
      return { userId: caller.id, kind, granted: true, textVersion: version };
    });
    await this.prisma.consent.createMany({ data: rows });
    return { pending: await this.pendingFor(caller.id) };
  }

  /** Every version, newest first; the admin panel's history. */
  history() {
    return this.prisma.legalDocument.findMany({
      orderBy: [{ slug: 'asc' }, { id: 'desc' }],
    });
  }

  /**
   * A new version; the old rows stay. Its version is the Istanbul date
   * (".2" for a second one that day), so nobody has to invent one.
   */
  async publish(actorId: number, slug: string, body: PublishBody) {
    await this.current(slug);
    const day = istanbulDate(new Date());
    const today = await this.prisma.legalDocument.count({
      where: { slug, version: { startsWith: day } },
    });
    return this.prisma.legalDocument.create({
      data: {
        slug,
        version: today ? `${day}.${today + 1}` : day,
        title: body.title,
        summary: body.summary ?? null,
        sections: body.sections as unknown as Prisma.InputJsonValue,
        draft: body.draft,
        publishedById: actorId,
      },
    });
  }
}
