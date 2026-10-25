import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { UsageService } from '../billing/usage.service.js';
import {
  CareKind,
  type PlantSpecies,
  PlantSpot,
  type Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DAY_MS, isSummer } from './season.js';
import { toCard } from './species.service.js';

export const createPlantSchema = z.object({
  speciesId: z.coerce.number().int().positive().optional(),
  scientificName: z.string().trim().min(2).max(120).optional(),
  nickname: z.string().trim().min(1).max(60),
  spot: z.enum(PlantSpot).default('INDOOR'),
  wateringIntervalDays: z.coerce.number().int().min(1).max(90).optional(),
});
export type CreatePlantBody = z.output<typeof createPlantSchema>;

export const updatePlantSchema = z
  .object({
    nickname: z.string().trim().min(1).max(60),
    spot: z.enum(PlantSpot),
    wateringIntervalDays: z.coerce.number().int().min(1).max(90),
  })
  .partial();
export type UpdatePlantBody = z.output<typeof updatePlantSchema>;

export const careEventSchema = z.object({
  kind: z.enum(CareKind),
  note: z.string().trim().max(500).optional(),
  // Backdating is allowed ("watered yesterday"), the future is not.
  at: z.coerce
    .date()
    .refine(
      (at) => at.getTime() <= Date.now() + 60_000,
      'Gelecek bir tarih olamaz',
    )
    .optional(),
});
export type CareEventBody = z.output<typeof careEventSchema>;

const FALLBACK_INTERVAL_DAYS = 7;

/**
 * Starting interval: the card's summer or winter value; outdoor pots dry
 * faster in summer sun and wind. A heuristic until weather-aware care.
 */
export function suggestedInterval(
  species: Pick<PlantSpecies, 'waterSummerDays' | 'waterWinterDays'> | null,
  spot: PlantSpot,
  now = new Date(),
) {
  if (!species) return FALLBACK_INTERVAL_DAYS;
  const summer = isSummer(now);
  const base = summer ? species.waterSummerDays : species.waterWinterDays;
  return summer && spot !== 'INDOOR'
    ? Math.max(1, Math.round(base * 0.75))
    : base;
}

const plantInclude = {
  species: true,
} satisfies Prisma.UserPlantInclude;
type PlantWithSpecies = Prisma.UserPlantGetPayload<{
  include: typeof plantInclude;
}>;

export function wateringState(
  plant: Pick<
    PlantWithSpecies,
    'lastWateredAt' | 'createdAt' | 'wateringIntervalDays'
  >,
  now = new Date(),
) {
  const from = plant.lastWateredAt ?? plant.createdAt;
  const next = new Date(from.getTime() + plant.wateringIntervalDays * DAY_MS);
  return {
    lastWateredAt: plant.lastWateredAt,
    nextWateringAt: next,
    dueInDays: Math.ceil((next.getTime() - now.getTime()) / DAY_MS),
  };
}

export const toMyPlant = (plant: PlantWithSpecies, now = new Date()) => ({
  id: plant.id,
  nickname: plant.nickname,
  spot: plant.spot,
  scientificName: plant.species?.scientificName ?? plant.scientificName,
  species: plant.species
    ? {
        id: plant.species.id,
        name: plant.species.turkishName,
        toxicToPets: plant.species.toxicToPets,
      }
    : null,
  wateringIntervalDays: plant.wateringIntervalDays,
  watering: wateringState(plant, now),
  createdAt: plant.createdAt,
});

@Injectable()
export class MyPlantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  /** Another user's plant answers like a missing one (no enumeration). */
  async owned(caller: AuthUser, id: number) {
    const plant = await this.prisma.userPlant.findFirst({
      where: { id, userId: caller.id, archivedAt: null },
      include: plantInclude,
    });
    if (!plant) throw new NotFoundException('Bitki bulunamadı');
    return plant;
  }

  async list(caller: AuthUser) {
    const plants = await this.prisma.userPlant.findMany({
      where: { userId: caller.id, archivedAt: null },
      include: plantInclude,
      orderBy: { createdAt: 'asc' },
    });
    const now = new Date();
    return plants
      .map((plant) => toMyPlant(plant, now))
      .sort((a, b) => a.watering.dueInDays - b.watering.dueInDays);
  }

  async create(caller: AuthUser, body: CreatePlantBody) {
    await this.usage.assertCanAddPlant(caller.id);
    const species = body.speciesId
      ? await this.prisma.plantSpecies.findUnique({
          where: { id: body.speciesId },
        })
      : null;
    if (body.speciesId && !species) {
      throw new NotFoundException('Bitki türü bulunamadı');
    }
    const plant = await this.prisma.userPlant.create({
      data: {
        userId: caller.id,
        speciesId: species?.id ?? null,
        scientificName: species ? null : (body.scientificName ?? null),
        nickname: body.nickname,
        spot: body.spot,
        wateringIntervalDays:
          body.wateringIntervalDays ?? suggestedInterval(species, body.spot),
      },
      include: plantInclude,
    });
    return toMyPlant(plant);
  }

  async detail(caller: AuthUser, id: number) {
    const plant = await this.owned(caller, id);
    const [careEvents, scans] = await Promise.all([
      this.prisma.careEvent.findMany({
        where: { userPlantId: plant.id },
        orderBy: { at: 'desc' },
        take: 30,
      }),
      this.prisma.scan.findMany({
        where: { userPlantId: plant.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, kind: true, result: true, createdAt: true },
      }),
    ]);
    return {
      ...toMyPlant(plant),
      card: plant.species ? toCard(plant.species) : null,
      careEvents,
      scans,
    };
  }

  async update(caller: AuthUser, id: number, body: UpdatePlantBody) {
    await this.owned(caller, id);
    const plant = await this.prisma.userPlant.update({
      where: { id },
      data: body,
      include: plantInclude,
    });
    return toMyPlant(plant);
  }

  /** Deletes the plant with its care log (personal data, KVKK). */
  async remove(caller: AuthUser, id: number) {
    await this.owned(caller, id);
    await this.prisma.userPlant.delete({ where: { id } });
    return { message: 'Bitki silindi' };
  }

  async logCare(caller: AuthUser, id: number, body: CareEventBody) {
    const plant = await this.owned(caller, id);
    const at = body.at ?? new Date();
    const [event] = await this.prisma.$transaction([
      this.prisma.careEvent.create({
        data: { userPlantId: plant.id, kind: body.kind, note: body.note, at },
      }),
      ...(body.kind === 'WATER' &&
      (!plant.lastWateredAt || plant.lastWateredAt < at)
        ? [
            this.prisma.userPlant.update({
              where: { id: plant.id },
              data: { lastWateredAt: at },
            }),
          ]
        : []),
    ]);
    const updated = await this.owned(caller, id);
    return { event, plant: toMyPlant(updated) };
  }

  /** Home screen and reminders: what needs water today or is overdue. */
  async today(caller: AuthUser) {
    const plants = await this.list(caller);
    return {
      due: plants.filter((plant) => plant.watering.dueInDays <= 0),
      upcoming: plants.filter(
        (plant) =>
          plant.watering.dueInDays > 0 && plant.watering.dueInDays <= 3,
      ),
    };
  }
}
