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
import {
  ACCEPTED_IMAGE_TYPES,
  ImageStorage,
} from '../storage/image-storage.js';
import {
  type ScanImage,
  VisionProvider,
  VisionProviderError,
} from './vision-provider.js';

/** Below this the app asks for a better photo instead of naming a plant. */
const CONFIDENT = 0.5;
const FOLLOW_UP_DAYS = 7;

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

  private image(file: UploadedImage | undefined): ScanImage {
    if (!file) throw new UnprocessableEntityException('Fotoğraf gerekli');
    if (!ACCEPTED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new UnprocessableEntityException(
        'Fotoğraf JPEG, PNG, WebP veya HEIC olmalı',
      );
    }
    return { data: file.buffer, mimeType: file.mimetype };
  }

  /** Consent and quota first; nothing is stored or sent before them. */
  private async prepare(
    caller: AuthUser,
    file: UploadedImage | undefined,
    kind: ScanKind,
  ) {
    const image = this.image(file);
    await this.consents.assertAiConsent(caller);
    if (kind === 'IDENTIFY') await this.usage.assertCanIdentify(caller.id);
    else await this.usage.assertCanDiagnose(caller.id);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: caller.id },
      select: { publicId: true },
    });
    const imageKey = await this.storage.put(
      user.publicId,
      image.data,
      image.mimeType,
    );
    return { image, imageKey };
  }

  private async save(
    caller: AuthUser,
    kind: ScanKind,
    imageKey: string,
    result: Prisma.InputJsonValue | undefined,
    userPlantId?: number,
  ) {
    return this.prisma.scan.create({
      data: {
        userId: caller.id,
        userPlantId: userPlantId ?? null,
        kind,
        status: result === undefined ? 'FAILED' : 'DONE',
        imageKey,
        provider: this.vision.name,
        result,
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

  async identify(caller: AuthUser, file: UploadedImage | undefined) {
    const { image, imageKey } = await this.prepare(caller, file, 'IDENTIFY');
    let identified;
    try {
      identified = await this.vision.identify(image);
    } catch (error) {
      await this.save(caller, 'IDENTIFY', imageKey, undefined);
      this.failed(error);
    }

    const suggestions = await Promise.all(
      identified.suggestions.map(async (s) => {
        const match = await this.species.match(s.scientificName);
        return {
          scientificName: s.scientificName,
          name: match?.turkishName ?? s.commonNames[0] ?? s.scientificName,
          probability: Math.round(s.probability * 100) / 100,
          speciesId: match?.id ?? null,
        };
      }),
    );
    const top = suggestions[0];
    const confident =
      identified.isPlant && !!top && top.probability >= CONFIDENT;
    const result = {
      isPlant: identified.isPlant,
      confident,
      suggestions,
      hint: confident
        ? null
        : identified.isPlant
          ? 'Emin olamadım. Yaprakları ve bitkinin tamamını net gösteren, gün ışığında çekilmiş bir fotoğraf deneyin.'
          : 'Fotoğrafta bir bitki göremedim.',
    };
    const scan = await this.save(caller, 'IDENTIFY', imageKey, result);
    const card =
      confident && top.speciesId
        ? await this.species.card(top.speciesId)
        : null;
    return { scanId: scan.id, ...result, card };
  }

  async diagnose(
    caller: AuthUser,
    file: UploadedImage | undefined,
    userPlantId?: number,
  ) {
    if (userPlantId !== undefined) await this.plants.owned(caller, userPlantId);
    const { image, imageKey } = await this.prepare(caller, file, 'DIAGNOSE');
    let diagnosis;
    try {
      diagnosis = await this.vision.diagnose(image);
    } catch (error) {
      await this.save(caller, 'DIAGNOSE', imageKey, undefined, userPlantId);
      this.failed(error);
    }
    const result = {
      ...diagnosis,
      issues: diagnosis.issues.map((issue) => ({
        ...issue,
        probability: Math.round(issue.probability * 100) / 100,
      })),
      disclaimer: DIAGNOSIS_DISCLAIMER,
      // The app reminds the user to send a new photo to see if it improves.
      followUpAt: diagnosis.isHealthy
        ? null
        : new Date(Date.now() + FOLLOW_UP_DAYS * DAY_MS).toISOString(),
    };
    const scan = await this.save(
      caller,
      'DIAGNOSE',
      imageKey,
      result,
      userPlantId,
    );
    return { scanId: scan.id, ...result };
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
