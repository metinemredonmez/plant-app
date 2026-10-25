import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { AiUsageService } from '../costs/ai-usage.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { redact, safeSteps, violations } from '../safety/plant-protection.js';
import { AuditService } from './audit.service.js';
import { CardDrafter, CardDraftError, type CardDraft } from './card-drafter.js';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const names = z.array(text(1, 80)).max(20);

/** A care card as the admin panel writes it; the app shows these fields. */
const speciesFields = z.object({
  scientificName: text(3, 120),
  turkishName: text(2, 80),
  otherNames: names,
  synonyms: names,
  family: text(2, 80).nullable().optional(),
  light: z.enum(['LOW', 'PARTIAL', 'BRIGHT_INDIRECT', 'DIRECT']),
  difficulty: z.enum(['NO_FUSS', 'EASY', 'MODERATE']),
  waterSummerDays: z.coerce.number().int().min(1).max(90),
  waterWinterDays: z.coerce.number().int().min(1).max(120),
  humidity: z.enum(['düşük', 'orta', 'yüksek']),
  // The balcony thresholds: frost and heat limits.
  tempMinC: z.coerce.number().int().min(-30).max(30),
  tempMaxC: z.coerce.number().int().min(0).max(50),
  toxicToPets: z.boolean().nullable(),
  toxicityNote: text(2, 400).nullable().optional(),
  summary: text(10, 600),
  wateringTip: text(5, 400),
  lightTip: text(5, 400),
  fertilizingTip: text(5, 400),
  commonProblems: z.array(text(3, 200)).max(10),
  spots: z.array(z.enum(['INDOOR', 'BALCONY', 'GARDEN'])).min(1),
  source: text(2, 200),
});
// Lists default to empty on create only: a patch must not wipe them.
export const speciesSchema = speciesFields
  .extend({
    otherNames: names.default([]),
    synonyms: names.default([]),
    commonProblems: speciesFields.shape.commonProblems.default([]),
  })
  .refine((card) => card.tempMaxC > card.tempMinC, {
    path: ['tempMaxC'],
    message: 'en yüksek sıcaklık en düşükten büyük olmalı',
  });
export type SpeciesBody = z.output<typeof speciesSchema>;
export const speciesPatchSchema = speciesFields
  .partial()
  .extend({ status: z.enum(['DRAFT', 'PUBLISHED']).optional() });
export type SpeciesPatch = z.output<typeof speciesPatchSchema>;

export const draftSchema = z.object({ scientificName: text(3, 120) });

const TEXT_FIELDS = [
  'summary',
  'wateringTip',
  'lightTip',
  'fertilizingTip',
  'toxicityNote',
] as const;

const FIELD_LABELS: Record<string, string> = {
  summary: 'Özet',
  wateringTip: 'Sulama',
  lightTip: 'Işık',
  fertilizingTip: 'Gübre',
  toxicityNote: 'Zehirlilik notu',
  commonProblems: 'Sık sorunlar',
};

/** Published cards must not name products, doses or schedules either. */
function assertSafe(card: Partial<SpeciesBody>) {
  const bad = [
    ...TEXT_FIELDS.filter((key) => card[key] && violations(card[key]!).length),
    ...(card.commonProblems?.some((item) => violations(item).length)
      ? ['commonProblems']
      : []),
  ];
  if (bad.length) {
    throw new UnprocessableEntityException(
      `Bakım kartında ürün adı, doz ya da uygulama zamanı olamaz: ${bad.map((key) => FIELD_LABELS[key]).join(', ')}`,
    );
  }
}

@Injectable()
export class SpeciesAdminService {
  private readonly logger = new Logger(SpeciesAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly drafter: CardDrafter,
    private readonly aiUsage: AiUsageService,
  ) {}

  list(q?: string, status?: 'DRAFT' | 'PUBLISHED') {
    const term = q?.trim();
    return this.prisma.plantSpecies.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(term
          ? {
              OR: [
                { turkishName: { contains: term, mode: 'insensitive' } },
                { scientificName: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { turkishName: 'asc' }],
      select: {
        id: true,
        scientificName: true,
        turkishName: true,
        status: true,
        reviewed: true,
        source: true,
        updatedAt: true,
      },
    });
  }

  async detail(id: number) {
    const species = await this.prisma.plantSpecies.findUnique({
      where: { id },
    });
    if (!species) throw new NotFoundException('Tür bulunamadı');
    return species;
  }

  private async unique(scientificName: string, except?: number) {
    const same = await this.prisma.plantSpecies.findUnique({
      where: { scientificName },
      select: { id: true },
    });
    if (same && same.id !== except) {
      throw new ConflictException('Bu bilimsel adla bir tür zaten var');
    }
  }

  /** Published at once; the app shows it as not yet checked by an expert. */
  async create(actor: AuthUser, body: SpeciesBody) {
    assertSafe(body);
    await this.unique(body.scientificName);
    const species = await this.prisma.plantSpecies.create({
      data: { ...body, status: 'PUBLISHED', reviewed: false },
    });
    await this.audit.log(
      actor,
      'species.create',
      { type: 'species', id: species.id },
      {
        scientificName: species.scientificName,
      },
    );
    return species;
  }

  async update(actor: AuthUser, id: number, body: SpeciesPatch) {
    const current = await this.detail(id);
    assertSafe(body);
    if (body.scientificName) await this.unique(body.scientificName, id);
    const merged = { ...current, ...body };
    if (merged.tempMaxC <= merged.tempMinC) {
      throw new UnprocessableEntityException(
        'tempMaxC: en yüksek sıcaklık en düşükten büyük olmalı',
      );
    }
    const species = await this.prisma.plantSpecies.update({
      where: { id },
      data: body,
    });
    await this.audit.log(actor, 'species.update', { type: 'species', id }, {
      fields: Object.keys(body),
    } as Prisma.InputJsonValue);
    return species;
  }

  /** The expert's check: reviewed and published. */
  async approve(actor: AuthUser, id: number) {
    await this.detail(id);
    const species = await this.prisma.plantSpecies.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        reviewed: true,
        reviewedAt: new Date(),
        reviewedById: actor.id,
      },
    });
    await this.audit.log(actor, 'species.approve', { type: 'species', id });
    return species;
  }

  /** A language model draft, kept out of the app until approved. */
  async draft(actor: AuthUser, scientificName: string) {
    await this.unique(scientificName);
    let drafted;
    try {
      drafted = await this.drafter.draft(scientificName);
    } catch (error) {
      if (!(error instanceof CardDraftError)) throw error;
      this.logger.error(`card draft: ${error.message}`);
      throw new BadGatewayException(
        'Taslak şu anda yazılamadı, lütfen biraz sonra tekrar deneyin',
      );
    }
    await this.aiUsage.record({
      task: 'CARD_DRAFT',
      provider: this.drafter.name,
      model: drafted.model,
      usage: drafted.usage,
      userId: actor.id,
    });
    const card = this.cleanDraft(drafted.card);
    const parsed = speciesSchema.safeParse({
      ...card,
      scientificName,
      source: `Dil modeli taslağı (${drafted.model ?? this.drafter.name}); uzman onayı bekliyor`,
    });
    if (!parsed.success) {
      this.logger.warn(
        `card draft out of range: ${parsed.error.issues[0]?.path.join('.')}`,
      );
      throw new BadGatewayException(
        'Taslak kullanılabilir değerler içermiyor, tekrar deneyin',
      );
    }
    const species = await this.prisma.plantSpecies.create({
      data: { ...parsed.data, status: 'DRAFT', reviewed: false },
    });
    await this.audit.log(
      actor,
      'species.draft',
      { type: 'species', id: species.id },
      {
        scientificName,
        model: drafted.model ?? this.drafter.name,
      },
    );
    return species;
  }

  /** Model text through the same guard as the assistant's answers. */
  private cleanDraft(card: CardDraft): CardDraft {
    const clean = (value: string) => redact(value).text;
    return {
      ...card,
      summary: clean(card.summary),
      wateringTip: clean(card.wateringTip),
      lightTip: clean(card.lightTip),
      fertilizingTip: clean(card.fertilizingTip),
      toxicityNote: card.toxicityNote ? clean(card.toxicityNote) || null : null,
      commonProblems: safeSteps(card.commonProblems).slice(0, 10),
    };
  }
}
