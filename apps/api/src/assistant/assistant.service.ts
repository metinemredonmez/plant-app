import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { UsageService } from '../billing/usage.service.js';
import { MyPlantsService } from '../care/my-plants.service.js';
import { ConsentsService } from '../consents/consents.service.js';
import { ownerContext } from '../care/profile.js';
import { PrismaService } from '../prisma/prisma.service.js';
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

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assistant: CareAssistant,
    private readonly plants: MyPlantsService,
    private readonly usage: UsageService,
    private readonly consents: ConsentsService,
  ) {}

  /** What the server knows about the plant: card, care log, last diagnosis. */
  private async context(
    caller: AuthUser,
    userPlantId?: number,
  ): Promise<PlantContext | null> {
    if (userPlantId === undefined) return null;
    const [plant, owner] = await Promise.all([
      this.plants.detail(caller, userPlantId),
      this.prisma.user.findUniqueOrThrow({
        where: { id: caller.id },
        select: { careProfile: true },
      }),
    ]);
    const diagnosis = plant.scans.find((scan) => scan.kind === 'DIAGNOSE');
    const issues = (
      diagnosis?.result as {
        issues?: { localName?: string; name: string }[];
      } | null
    )?.issues;
    return {
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
      owner: ownerContext(owner.careProfile) ?? undefined,
      lastDiagnosis: issues?.length
        ? `${diagnosis!.createdAt.toISOString().slice(0, 10)}: ${issues.map((i) => i.localName ?? i.name).join(', ')}`
        : undefined,
    };
  }

  async history(caller: AuthUser, userPlantId?: number) {
    if (userPlantId !== undefined) await this.plants.owned(caller, userPlantId);
    const rows = await this.prisma.chatMessage.findMany({
      where: { userId: caller.id, userPlantId: userPlantId ?? null },
      orderBy: { id: 'desc' },
      take: 50,
      select: { id: true, role: true, content: true, createdAt: true },
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
        select: { id: true, role: true, content: true, createdAt: true },
      }),
    ]);
    return { reply };
  }
}
