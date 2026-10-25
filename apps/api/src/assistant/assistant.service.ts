import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { UsageService } from '../billing/usage.service.js';
import { MyPlantsService } from '../care/my-plants.service.js';
import { ConsentsService } from '../consents/consents.service.js';
import { ownerContext } from '../care/profile.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { guardReply } from '../safety/plant-protection.js';
import {
  WeatherProvider,
  weatherSummary,
} from '../weather/weather-provider.js';
import {
  AssistantUnavailableError,
  CareAssistant,
  type ChatTurn,
  type PlantContext,
} from './care-assistant.js';

export const askSchema = z.object({
  userPlantId: z.coerce.number().int().positive().optional(),
  message: z.string().trim().min(1).max(1000),
});
export type AskBody = z.output<typeof askSchema>;

export const reportSchema = z.object({
  reason: z.enum(['WRONG', 'UNSAFE', 'OFF_TOPIC', 'OTHER']),
  note: z.string().trim().max(500).optional(),
});
export type ReportBody = z.output<typeof reportSchema>;

const MESSAGE_FIELDS = {
  id: true,
  role: true,
  content: true,
  reportedAt: true,
  createdAt: true,
} as const;

/** Turns sent back to the model; older ones stay in the database only. */
const HISTORY_TURNS = 12;

const SPOT: Record<string, string> = {
  INDOOR: 'iç mekân',
  BALCONY: 'balkon',
  GARDEN: 'bahçe',
};
const LIGHT: Record<string, string> = {
  LOW: 'az ışık',
  PARTIAL: 'orta ışık',
  BRIGHT_INDIRECT: 'parlak, dolaylı ışık',
  DIRECT: 'doğrudan güneş',
};
const POT: Record<string, string> = {
  PLASTIC: 'plastik saksı',
  TERRACOTTA: 'pişmiş toprak saksı',
  GLAZED: 'sırlı seramik saksı',
  SELF_WATERING: 'kendinden sulamalı saksı',
};

interface StoredDiagnosis {
  issues?: { localName?: string; name: string }[];
  isHealthy?: boolean;
  followUp?: { trend: keyof typeof TREND };
}
const TREND = {
  better: 'fotoğrafa göre daha iyi',
  same: 'fotoğrafa göre değişim yok',
  worse: 'fotoğrafa göre daha kötü',
  unclear: 'karşılaştırılamadı',
} as const;
const RECOVERY = { BETTER: 'daha iyi', SAME: 'aynı', WORSE: 'daha kötü' };
const day = (at: Date) => at.toISOString().slice(0, 10);

/**
 * "2026-10-21: Külleme; takip 2026-10-26: fotoğrafa göre daha iyi, sahibine
 * göre aynı". Scans come newest first.
 */
export function diagnosisLine(
  scans: {
    id: number;
    kind: string;
    parentId: number | null;
    link: string | null;
    recovery: keyof typeof RECOVERY | null;
    result: unknown;
    createdAt: Date;
  }[],
) {
  const root = scans.find((scan) => scan.kind === 'DIAGNOSE' && !scan.link);
  if (!root) return undefined;
  const linked = scans.filter((scan) => scan.parentId === root.id);
  const first = (linked.find((s) => s.link === 'SECOND_PHOTO') ?? root)
    .result as StoredDiagnosis | null;
  const issues = first?.issues ?? [];
  if (!issues.length) return undefined;
  let line = `${day(root.createdAt)}: ${issues.map((i) => i.localName ?? i.name).join(', ')}`;
  const followUp = linked.find((scan) => scan.link === 'FOLLOW_UP');
  const trend = (followUp?.result as StoredDiagnosis | null)?.followUp?.trend;
  if (followUp && trend) {
    line += `; takip ${day(followUp.createdAt)}: ${TREND[trend]}`;
    if (followUp.recovery) {
      line += `, sahibine göre ${RECOVERY[followUp.recovery]}`;
    }
  }
  return line;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assistant: CareAssistant,
    private readonly plants: MyPlantsService,
    private readonly usage: UsageService,
    private readonly consents: ConsentsService,
    private readonly weather: WeatherProvider,
  ) {}

  /** The owner's city, its weather and their answers; for every chat. */
  private async ownerFacts(caller: AuthUser) {
    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: caller.id },
      select: { careProfile: true, city: true },
    });
    const weather = owner.city ? await this.weather.forCity(owner.city) : null;
    return {
      city: owner.city ?? undefined,
      weather: (weather && weatherSummary(weather)) ?? undefined,
      owner: ownerContext(owner.careProfile) ?? undefined,
    };
  }

  /**
   * What the server knows (plan, week 6): the plant's card, place, care log,
   * last diagnosis and follow-up; the owner's city and its weather.
   */
  private async context(
    caller: AuthUser,
    userPlantId?: number,
  ): Promise<PlantContext | null> {
    if (userPlantId === undefined) {
      const facts = await this.ownerFacts(caller);
      return Object.values(facts).some(Boolean) ? facts : null;
    }
    const [plant, facts] = await Promise.all([
      this.plants.detail(caller, userPlantId),
      this.ownerFacts(caller),
    ]);
    return {
      ...facts,
      nickname: plant.nickname,
      species: plant.species?.name,
      scientificName: plant.scientificName ?? undefined,
      spot: [
        SPOT[plant.spot],
        plant.light && LIGHT[plant.light],
        plant.pot && POT[plant.pot],
      ]
        .filter(Boolean)
        .join(', '),
      wateringIntervalDays: plant.wateringIntervalDays,
      lastWateredAt:
        plant.watering.lastWateredAt?.toISOString().slice(0, 10) ?? null,
      card: plant.card
        ? `${plant.card.summary} Sulama: ${plant.card.water.tip} Işık: ${plant.card.lightTip}`
        : undefined,
      recentCare: plant.careEvents
        .slice(0, 5)
        .map(
          (event) =>
            `${event.at.toISOString().slice(0, 10)} ${event.kind}${event.note ? ` (${event.note})` : ''}`,
        ),
      lastDiagnosis: diagnosisLine(plant.scans),
    };
  }

  async history(caller: AuthUser, userPlantId?: number) {
    if (userPlantId !== undefined) await this.plants.owned(caller, userPlantId);
    const rows = await this.prisma.chatMessage.findMany({
      where: { userId: caller.id, userPlantId: userPlantId ?? null },
      orderBy: { id: 'desc' },
      take: 50,
      select: MESSAGE_FIELDS,
    });
    return rows.reverse();
  }

  async ask(caller: AuthUser, body: AskBody) {
    const context = await this.context(caller, body.userPlantId);
    await this.consents.assertAiConsent(caller);
    await this.usage.assertCanAsk(caller.id);

    const earlier = await this.prisma.chatMessage.findMany({
      where: { userId: caller.id, userPlantId: body.userPlantId ?? null },
      orderBy: { id: 'desc' },
      take: HISTORY_TURNS,
    });
    const history: ChatTurn[] = [
      ...earlier.reverse().map((row) => ({
        role: row.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: row.content,
      })),
      { role: 'user', content: body.message },
    ];
    // The API wants the conversation to start with a user turn.
    while (history[0]?.role === 'assistant') history.shift();

    let answer: string;
    try {
      answer = await this.assistant.reply(history, context);
    } catch (error) {
      if (!(error instanceof AssistantUnavailableError)) throw error;
      this.logger.error(`assistant: ${error.message}`);
      throw new BadGatewayException(
        'Asistan şu anda yanıt veremiyor, lütfen biraz sonra tekrar deneyin',
      );
    }
    // What the user sees and what is stored: no product, dose or schedule.
    const guarded = guardReply(answer, body.message);
    if (guarded.redacted) {
      // Counted for review; the text itself stays out of the logs.
      this.logger.warn('assistant reply redacted (plant protection)');
    }
    answer = guarded.text;

    // Saved only when answered, so a failure does not use up the quota.
    const [, reply] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          userId: caller.id,
          userPlantId: body.userPlantId ?? null,
          role: 'USER',
          content: body.message,
        },
      }),
      this.prisma.chatMessage.create({
        data: {
          userId: caller.id,
          userPlantId: body.userPlantId ?? null,
          role: 'ASSISTANT',
          content: answer,
        },
        select: MESSAGE_FIELDS,
      }),
    ]);
    return { reply };
  }

  /** "Bu yanıtı bildir": only the caller's assistant answers; a new report replaces the old. */
  async report(caller: AuthUser, id: number, body: ReportBody) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id, userId: caller.id, role: 'ASSISTANT' },
      select: { id: true },
    });
    if (!message) throw new NotFoundException('Yanıt bulunamadı');
    return this.prisma.chatMessage.update({
      where: { id },
      data: {
        reportReason: body.reason,
        reportNote: body.note || null,
        reportedAt: new Date(),
      },
      select: { id: true, reportedAt: true },
    });
  }
}
