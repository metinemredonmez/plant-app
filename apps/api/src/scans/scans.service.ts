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
import type { Prisma, ScanKind } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImageStorage } from '../storage/image-storage.js';
import { ACCEPTED_PHOTO_TYPES, type CleanPhoto, cleanPhoto } from './photo.js';
import {
  type IdentifyResult,
  VisionProvider,
  VisionProviderError,
} from './vision-provider.js';

// Starting thresholds from the plan, to be tuned with our own data: one
// species from SURE up, the top three as possible species from POSSIBLE up,
// "Bitki tanınamadı" with photo tips below.
const SURE = 0.6;
const POSSIBLE = 0.2;
const FOLLOW_UP_DAYS = 7;

export const PHOTO_TIPS = [
  'Bitkiyi gün ışığında, flaş kullanmadan çek.',
  'Yaprakları ve varsa çiçeği kadrajı dolduracak kadar yakından çek.',
  'Tek bir bitkiye odaklan; arkada başka bitki olmasın.',
  'Fotoğraf bulanık çıktıysa telefonu sabit tutup tekrar çek.',
];

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
    }: { chargeable?: boolean; userPlantId?: number } = {},
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

  async diagnose(
    caller: AuthUser,
    file: UploadedImage | undefined,
    userPlantId?: number,
  ) {
    if (userPlantId !== undefined) await this.plants.owned(caller, userPlantId);
    const photo = await this.accept(caller, file);
    const earlier = await this.earlier(caller, 'DIAGNOSE', photo, userPlantId);
    if (earlier) {
      return {
        scanId: earlier.id,
        duplicate: true,
        ...(earlier.result as Record<string, unknown>),
      };
    }

    await this.usage.assertCanDiagnose(caller.id);
    const imageKey = await this.store(caller, photo);
    let diagnosis;
    try {
      diagnosis = await this.vision.diagnose(photo);
    } catch (error) {
      await this.save(caller, 'DIAGNOSE', photo, imageKey, undefined, {
        userPlantId,
      });
      this.failed(error);
    }
    const result = {
      ...diagnosis,
      issues: diagnosis.issues.map((issue) => ({
        ...issue,
        probability: Math.round(issue.probability * 100) / 100,
      })),
      hint: diagnosis.isPlant ? null : 'Fotoğrafta bir bitki göremedim.',
      tips: diagnosis.isPlant ? [] : PHOTO_TIPS,
      disclaimer: DIAGNOSIS_DISCLAIMER,
      // The app reminds the user to send a new photo to see if it improves.
      followUpAt:
        diagnosis.isPlant && !diagnosis.isHealthy
          ? new Date(Date.now() + FOLLOW_UP_DAYS * DAY_MS).toISOString()
          : null,
    };
    const scan = await this.save(caller, 'DIAGNOSE', photo, imageKey, result, {
      // A photo without a plant does not use up the trial diagnosis.
      chargeable: diagnosis.isPlant,
      userPlantId,
    });
    return { scanId: scan.id, duplicate: false, ...result };
  }

  async list(caller: AuthUser) {
    return this.prisma.scan.findMany({
      where: { userId: caller.id, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        kind: true,
        userPlantId: true,
        result: true,
        createdAt: true,
      },
    });
  }

  async detail(caller: AuthUser, id: number) {
    const scan = await this.prisma.scan.findFirst({
      where: { id, userId: caller.id },
      select: {
        id: true,
        kind: true,
        status: true,
        userPlantId: true,
        result: true,
        createdAt: true,
      },
    });
    if (!scan) throw new NotFoundException('Tarama bulunamadı');
    return scan;
  }
}
