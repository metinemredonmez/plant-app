import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/auth.decorators.js';
import { UsageService } from '../billing/usage.service.js';
import { MyPlantsService } from '../care/my-plants.service.js';
import { DAY_MS } from '../care/season.js';
import { SpeciesService } from '../care/species.service.js';
import { ConsentsService } from '../consents/consents.service.js';
import { z } from 'zod';

import type {
  Prisma,
  Scan,
  ScanKind,
  ScanLink,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EXPERT_REFERRAL,
  redact,
  safeSteps,
} from '../safety/plant-protection.js';
import { ImageStorage } from '../storage/image-storage.js';
import { ACCEPTED_PHOTO_TYPES, type CleanPhoto, cleanPhoto } from './photo.js';
import {
  type DiagnoseResult,
  type IdentifyResult,
  VisionProvider,
  VisionProviderError,
} from './vision-provider.js';

// Starting thresholds from the plan, to be tuned with our own data: one
// species from SURE up, the top three as possible species from POSSIBLE up,
// "Bitki tanınamadı" with photo tips below.
const SURE = 0.6;
const POSSIBLE = 0.2;

// Diagnosis (ADR 0013): below these the app asks for one more photo, which
// uses no quota. Follow-ups are reminded after 5 days, two per diagnosis.
const DIAGNOSIS_SURE = 0.4;
const HEALTHY_SURE = 0.6;
const FOLLOW_UP_DAYS = 5;
const MAX_FOLLOW_UPS = 2;
const SECOND_PHOTO_MS = DAY_MS;
// The healthy share moving this much between photos counts as a change.
const TREND_STEP = 0.15;

export const PHOTO_TIPS = [
  'Bitkiyi gün ışığında, flaş kullanmadan çek.',
  'Yaprakları ve varsa çiçeği kadrajı dolduracak kadar yakından çek.',
  'Tek bir bitkiye odaklan; arkada başka bitki olmasın.',
  'Fotoğraf bulanık çıktıysa telefonu sabit tutup tekrar çek.',
];

export const DIAGNOSIS_TIPS = [
  'Sorunlu yaprağı kadrajı dolduracak kadar yakından çek.',
  'Gün ışığında, flaşsız çek; lekeler net görünsün.',
  'Yaprağın alt yüzünü de çek; zararlılar çoğu zaman oradadır.',
];

const UNSURE_HINT =
  'Emin olamadım. Sorunlu yaprağı yakından, gün ışığında çekip ikinci bir fotoğraf gönderirsen daha net söyleyebilirim.';
const STILL_UNSURE_HINT =
  'Hâlâ emin olamadım. Bitkiyi bir ziraat mühendisine ya da fidanlığa göstermeni öneririm.';

type Trend = 'better' | 'same' | 'worse' | 'unclear';
const TREND_HINTS: Record<Trend, string> = {
  better: 'Fotoğrafa göre toparlanıyor. Bakıma böyle devam et.',
  same: 'Fotoğrafa göre belirgin bir değişim yok. Birkaç gün daha izle; kötüleşirse bir ziraat mühendisine göster.',
  worse:
    'Fotoğrafa göre kötüleşmiş görünüyor. Bir ziraat mühendisine ya da il veya ilçe tarım müdürlüğüne göstermeni öneririm.',
  unclear: 'Karşılaştıramadım. Aynı bölümü benzer ışıkta yeniden çek.',
};

/** A DIAGNOSE scan's stored `result`, as the app receives it. */
export interface Diagnosis extends DiagnoseResult {
  hint: string | null;
  tips: string[];
  disclaimer: string;
  /** Expert and B-Reçete referral; on every result with a plant. */
  referral: string | null;
  confident: boolean;
  /** Unsure first result: one more photo, no quota. */
  needsSecondPhoto: boolean;
  /** When to remind the follow-up photo; null when there is nothing to follow. */
  followUpAt: string | null;
  followUp?: {
    trend: Trend;
    before: { healthyProbability: number; issue: string | null; at: string };
  };
}

export interface DiagnoseOptions {
  userPlantId?: number;
  secondPhotoOf?: number;
  followUpOf?: number;
}

export const feedbackSchema = z
  .object({
    correct: z.boolean().optional(),
    recovery: z.enum(['BETTER', 'SAME', 'WORSE']).optional(),
  })
  .refine((body) => body.correct !== undefined || body.recovery !== undefined, {
    message: 'Bir yanıt seçin',
  });
export type FeedbackBody = z.output<typeof feedbackSchema>;

const stored = (scan: Scan) => scan.result as unknown as Diagnosis;

function trendOf(before: Diagnosis, now: Diagnosis): Trend {
  if (!before.isPlant || !now.isPlant) return 'unclear';
  if (now.isHealthy && !before.isHealthy) return 'better';
  const delta = now.healthyProbability - before.healthyProbability;
  if (delta >= TREND_STEP) return 'better';
  if (delta <= -TREND_STEP) return 'worse';
  return 'same';
}

type Outcome = 'identified' | 'possible' | 'not_recognized';

interface Identification {
  outcome: Outcome;
  isPlant: boolean;
  confident: boolean;
  suggestions: {
    scientificName: string;
    name: string;
    probability: number;
    speciesId: number | null;
  }[];
  hint: string | null;
  tips: string[];
}

export const DIAGNOSIS_DISCLAIMER =
  'Bu bir ön değerlendirmedir, kesin teşhis değildir. Bitki koruma ürünü (ilaç) gerekiyorsa yalnızca yetkili bir ziraat mühendisinin reçetesiyle kullanın.';

/** What the app sees of a scan in lists and on the plant page. */
export const SCAN_FIELDS = {
  id: true,
  kind: true,
  userPlantId: true,
  parentId: true,
  link: true,
  correct: true,
  recovery: true,
  result: true,
  createdAt: true,
} as const;

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vision: VisionProvider,
    private readonly storage: ImageStorage,
    private readonly species: SpeciesService,
    private readonly plants: MyPlantsService,
    private readonly usage: UsageService,
    private readonly consents: ConsentsService,
  ) {}

  /** Consent first; nothing is decoded, stored or sent before it. */
  private async accept(
    caller: AuthUser,
    file: UploadedImage | undefined,
  ): Promise<CleanPhoto> {
    if (!file) throw new UnprocessableEntityException('Fotoğraf gerekli');
    if (!ACCEPTED_PHOTO_TYPES.includes(file.mimetype)) {
      throw new UnprocessableEntityException(
        'Fotoğraf JPEG, PNG veya WebP olmalı',
      );
    }
    await this.consents.assertAiConsent(caller);
    const photo = await cleanPhoto(file.buffer);
    if (!photo) {
      throw new UnprocessableEntityException(
        'Fotoğraf okunamadı, başka bir fotoğraf deneyin',
      );
    }
    return photo;
  }

  /** The same photo again: its earlier result, no provider call, no quota. */
  private earlier(
    caller: AuthUser,
    kind: ScanKind,
    photo: CleanPhoto,
    userPlantId?: number,
  ) {
    return this.prisma.scan.findFirst({
      where: {
        userId: caller.id,
        kind,
        status: 'DONE',
        imageHash: photo.sha256,
        userPlantId: userPlantId ?? null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async store(caller: AuthUser, photo: CleanPhoto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: caller.id },
      select: { publicId: true },
    });
    return this.storage.put(user.publicId, photo.data, photo.mimeType);
  }

  private async save(
    caller: AuthUser,
    kind: ScanKind,
    photo: CleanPhoto,
    imageKey: string,
    result: Prisma.InputJsonValue | undefined,
    {
      chargeable = true,
      userPlantId,
      parentId,
      link,
    }: {
      chargeable?: boolean;
      userPlantId?: number;
      parentId?: number;
      link?: ScanLink | null;
    } = {},
  ) {
    return this.prisma.scan.create({
      data: {
        userId: caller.id,
        userPlantId: userPlantId ?? null,
        kind,
        status: result === undefined ? 'FAILED' : 'DONE',
        imageKey,
        imageHash: photo.sha256,
        provider: this.vision.name,
        result,
        chargeable,
        parentId: parentId ?? null,
        link: link ?? null,
      },
    });
  }

  private failed(error: unknown): never {
    if (!(error instanceof VisionProviderError)) throw error;
    this.logger.error(error.message);
    throw new BadGatewayException(
      'Fotoğraf şu anda incelenemedi, lütfen biraz sonra tekrar deneyin',
    );
  }

  private async present(identified: IdentifyResult): Promise<Identification> {
    const suggestions = await Promise.all(
      identified.suggestions.slice(0, 3).map(async (s) => {
        // Turkish name: care card, then Wikidata, then the provider.
        const match = await this.species.match(s.scientificName);
        const known = match
          ? null
          : await this.species.plantName(s.scientificName);
        return {
          scientificName: s.scientificName,
          name:
            match?.turkishName ??
            known?.turkishName ??
            s.commonNames[0] ??
            s.scientificName,
          probability: Math.round(s.probability * 100) / 100,
          speciesId: match?.id ?? null,
        };
      }),
    );
    const top = suggestions[0];
    const outcome: Outcome =
      !identified.isPlant || !top || top.probability < POSSIBLE
        ? 'not_recognized'
        : top.probability >= SURE
          ? 'identified'
          : 'possible';
    const hints: Record<Outcome, string | null> = {
      identified: null,
      possible:
        'Emin olamadım. Olası türler aşağıda; yaprakları yakından gösteren ikinci bir fotoğrafla kesinleştirebilirim.',
      not_recognized: identified.isPlant
        ? 'Bu fotoğraftan bitkiyi tanıyamadım.'
        : 'Fotoğrafta bir bitki göremedim.',
    };
    return {
      outcome,
      isPlant: identified.isPlant,
      confident: outcome === 'identified',
      suggestions: outcome === 'not_recognized' ? [] : suggestions,
      hint: hints[outcome],
      tips: outcome === 'identified' ? [] : PHOTO_TIPS,
    };
  }

  private async identification(
    scanId: number,
    result: Identification,
    duplicate: boolean,
  ) {
    const top = result.suggestions[0];
    const card =
      result.outcome === 'identified' && top?.speciesId
        ? await this.species.card(top.speciesId).catch(() => null)
        : null;
    return { scanId, duplicate, ...result, card };
  }

  async identify(caller: AuthUser, file: UploadedImage | undefined) {
    const photo = await this.accept(caller, file);
    const earlier = await this.earlier(caller, 'IDENTIFY', photo);
    if (earlier) {
      return this.identification(
        earlier.id,
        earlier.result as unknown as Identification,
        true,
      );
    }

    await this.usage.assertCanIdentify(caller.id);
    const imageKey = await this.store(caller, photo);
    let identified;
    try {
      identified = await this.vision.identify(photo);
    } catch (error) {
      await this.save(caller, 'IDENTIFY', photo, imageKey, undefined);
      this.failed(error);
    }
    const result = await this.present(identified);
    const scan = await this.save(
      caller,
      'IDENTIFY',
      photo,
      imageKey,
      result as unknown as Prisma.InputJsonValue,
      { chargeable: result.outcome !== 'not_recognized' },
    );
    return this.identification(scan.id, result, false);
  }

  /**
   * Provider output as shown: unsafe text out (product names, doses,
   * schedules), the expert referral in, unsure results asking for one more
   * photo.
   */
  private presentDiagnosis(
    diagnosis: DiagnoseResult,
    link: ScanLink | null,
  ): Diagnosis {
    const issues = diagnosis.issues.map((issue) => ({
      ...issue,
      probability: Math.round(issue.probability * 100) / 100,
      description: issue.description
        ? redact(issue.description).text || undefined
        : undefined,
      biological: safeSteps(issue.biological),
      prevention: safeSteps(issue.prevention),
    }));
    const top = issues[0];
    const unsure =
      diagnosis.isPlant &&
      (diagnosis.isHealthy
        ? diagnosis.healthyProbability < HEALTHY_SURE
        : !top || top.probability < DIAGNOSIS_SURE);
    const needsSecondPhoto = unsure && link === null;
    const hint = !diagnosis.isPlant
      ? 'Fotoğrafta bir bitki göremedim.'
      : needsSecondPhoto
        ? UNSURE_HINT
        : unsure
          ? STILL_UNSURE_HINT
          : null;
    return {
      ...diagnosis,
      issues,
      hint,
      tips: !diagnosis.isPlant
        ? PHOTO_TIPS
        : needsSecondPhoto
          ? DIAGNOSIS_TIPS
          : [],
      disclaimer: DIAGNOSIS_DISCLAIMER,
      referral: diagnosis.isPlant ? EXPERT_REFERRAL : null,
      confident: diagnosis.isPlant && !unsure,
      needsSecondPhoto,
      // The app reminds the user to send a new photo to see if it improves.
      followUpAt:
        diagnosis.isPlant && !diagnosis.isHealthy && link !== 'FOLLOW_UP'
          ? new Date(Date.now() + FOLLOW_UP_DAYS * DAY_MS).toISOString()
          : null,
    };
  }

  /**
   * The first diagnosis a second photo or follow-up belongs to, and the
   * result to compare a follow-up with (the second photo when there is one).
   */
  private async chain(caller: AuthUser, link: ScanLink, scanId: number) {
    const scan = await this.prisma.scan.findFirst({
      where: {
        id: scanId,
        userId: caller.id,
        kind: 'DIAGNOSE',
        status: 'DONE',
      },
    });
    if (!scan) throw new NotFoundException('Teşhis bulunamadı');
    const root = scan.parentId
      ? await this.prisma.scan.findUniqueOrThrow({
          where: { id: scan.parentId },
        })
      : scan;
    const linked = await this.prisma.scan.findMany({
      where: { parentId: root.id, status: 'DONE' },
      orderBy: { createdAt: 'asc' },
    });
    const second = linked.find((s) => s.link === 'SECOND_PHOTO');
    if (link === 'SECOND_PHOTO') {
      if (
        scan.id !== root.id ||
        !stored(root).needsSecondPhoto ||
        second ||
        Date.now() - root.createdAt.getTime() > SECOND_PHOTO_MS
      ) {
        throw new UnprocessableEntityException(
          'İkinci fotoğraf yalnız emin olunamayan bir teşhisten sonra, 24 saat içinde bir kez gönderilebilir',
        );
      }
    } else {
      if (![root, second].some((s) => s && stored(s).followUpAt)) {
        throw new UnprocessableEntityException(
          'Takip fotoğrafı yalnız sorun bulunan bir teşhisten sonra gönderilebilir',
        );
      }
      if (
        linked.filter((s) => s.link === 'FOLLOW_UP').length >= MAX_FOLLOW_UPS
      ) {
        throw new UnprocessableEntityException(
          `Bir teşhis için en çok ${MAX_FOLLOW_UPS} takip fotoğrafı gönderilebilir`,
        );
      }
    }
    return { root, reference: second ?? root };
  }

  async diagnose(
    caller: AuthUser,
    file: UploadedImage | undefined,
    options: DiagnoseOptions = {},
  ) {
    if (options.secondPhotoOf && options.followUpOf) {
      throw new UnprocessableEntityException(
        'İkinci fotoğraf ile takip fotoğrafı birlikte gönderilemez',
      );
    }
    const link: ScanLink | null = options.secondPhotoOf
      ? 'SECOND_PHOTO'
      : options.followUpOf
        ? 'FOLLOW_UP'
        : null;
    const chain = link
      ? await this.chain(
          caller,
          link,
          (options.secondPhotoOf ?? options.followUpOf)!,
        )
      : null;
    // A linked photo belongs to the first diagnosis's plant.
    const userPlantId = chain
      ? (chain.root.userPlantId ?? undefined)
      : options.userPlantId;
    if (!chain && userPlantId !== undefined) {
      await this.plants.owned(caller, userPlantId);
    }
    const photo = await this.accept(caller, file);
    const earlier = await this.earlier(caller, 'DIAGNOSE', photo, userPlantId);
    if (earlier) {
      return {
        scanId: earlier.id,
        duplicate: true,
        ...(earlier.result as Record<string, unknown>),
      };
    }

    if (chain) await this.usage.assertCanLinkScan(caller.id);
    else await this.usage.assertCanDiagnose(caller.id);
    const imageKey = await this.store(caller, photo);
    const linkTo = { parentId: chain?.root.id, link };
    let diagnosis;
    try {
      diagnosis = await this.vision.diagnose(photo);
    } catch (error) {
      await this.save(caller, 'DIAGNOSE', photo, imageKey, undefined, {
        userPlantId,
        ...linkTo,
      });
      this.failed(error);
    }
    let result = this.presentDiagnosis(diagnosis, link);
    if (link === 'FOLLOW_UP' && chain) {
      const before = stored(chain.reference);
      const trend = trendOf(before, result);
      const issue = before.issues[0];
      result = {
        ...result,
        hint: TREND_HINTS[trend],
        tips: trend === 'unclear' ? DIAGNOSIS_TIPS : [],
        followUp: {
          trend,
          before: {
            healthyProbability: before.healthyProbability,
            issue: issue ? (issue.localName ?? issue.name) : null,
            at: chain.reference.createdAt.toISOString(),
          },
        },
      };
    }
    const scan = await this.save(
      caller,
      'DIAGNOSE',
      photo,
      imageKey,
      result as unknown as Prisma.InputJsonValue,
      {
        // A photo without a plant does not use up the trial diagnosis, and a
        // linked photo belongs to one already counted.
        chargeable: diagnosis.isPlant && !chain,
        userPlantId,
        ...linkTo,
      },
    );
    return { scanId: scan.id, duplicate: false, ...result };
  }

  /** "Bu teşhis doğru muydu?" on a diagnosis; better, same or worse on a follow-up. */
  async feedback(caller: AuthUser, id: number, body: FeedbackBody) {
    const scan = await this.prisma.scan.findFirst({
      where: { id, userId: caller.id, kind: 'DIAGNOSE', status: 'DONE' },
    });
    if (!scan) throw new NotFoundException('Teşhis bulunamadı');
    const followUp = scan.link === 'FOLLOW_UP';
    if (body.recovery && !followUp) {
      throw new UnprocessableEntityException(
        'İyileşme yalnız takip fotoğrafında sorulur',
      );
    }
    if (body.correct !== undefined && followUp) {
      throw new UnprocessableEntityException(
        'Teşhisin doğruluğu ilk teşhiste sorulur',
      );
    }
    return this.prisma.scan.update({
      where: { id },
      data: {
        correct: body.correct,
        recovery: body.recovery,
        feedbackAt: new Date(),
      },
      select: { id: true, correct: true, recovery: true },
    });
  }

  async list(caller: AuthUser) {
    return this.prisma.scan.findMany({
      where: { userId: caller.id, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: SCAN_FIELDS,
    });
  }

  async detail(caller: AuthUser, id: number) {
    const scan = await this.prisma.scan.findFirst({
      where: { id, userId: caller.id },
      select: { ...SCAN_FIELDS, status: true },
    });
    if (!scan) throw new NotFoundException('Tarama bulunamadı');
    return scan;
  }
}
