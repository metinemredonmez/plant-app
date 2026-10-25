import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { UsageService } from '../billing/usage.service.js';
import {
  CareKind,
  LightLevel,
  type PlantSpecies,
  PlantSpot,
  PotKind,
  type Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DAY_MS, istanbulDate, istanbulDayStart, isSummer } from './season.js';
import { toCard } from './species.service.js';

const placement = {
  spot: z.enum(PlantSpot),
  light: z.enum(LightLevel).nullable(),
  pot: z.enum(PotKind).nullable(),
};

export const createPlantSchema = z.object({
  speciesId: z.coerce.number().int().positive().optional(),
  scientificName: z.string().trim().min(2).max(120).optional(),
  nickname: z.string().trim().min(1).max(60),
  spot: placement.spot.default('INDOOR'),
  light: placement.light.optional(),
  pot: placement.pot.optional(),
  // The user's own interval; without it the card decides.
  wateringIntervalDays: z.coerce.number().int().min(1).max(90).optional(),
});
export type CreatePlantBody = z.output<typeof createPlantSchema>;

export const updatePlantSchema = z
  .object({
    nickname: z.string().trim().min(1).max(60),
    ...placement,
    // null hands the interval back to the card and the season.
    wateringIntervalDays: z.number().int().min(1).max(90).nullable(),
  })
  .partial();
export type UpdatePlantBody = z.output<typeof updatePlantSchema>;

export const scheduleQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(31).default(14),
});

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

// Terracotta breathes and dries out sooner; a self-watering pot holds a
// reservoir. Heuristics until weather-aware care (week 10).
const POT_FACTOR: Record<PotKind, number> = {
  PLASTIC: 1,
  GLAZED: 1,
  TERRACOTTA: 0.8,
  SELF_WATERING: 1.5,
};

/**
 * The card's summer or winter value; outdoor pots dry faster in summer sun
 * and wind, and the pot material shifts it again.
 */
export function suggestedInterval(
  species: Pick<PlantSpecies, 'waterSummerDays' | 'waterWinterDays'> | null,
  spot: PlantSpot,
  pot: PotKind | null = null,
  at = new Date(),
) {
  if (!species) return FALLBACK_INTERVAL_DAYS;
  const summer = isSummer(at);
  let days = summer ? species.waterSummerDays : species.waterWinterDays;
  if (summer && spot !== 'INDOOR') days *= 0.75;
  if (pot) days *= POT_FACTOR[pot];
  return Math.max(1, Math.round(days));
}

const plantInclude = {
  species: true,
} satisfies Prisma.UserPlantInclude;
type PlantWithSpecies = Prisma.UserPlantGetPayload<{
  include: typeof plantInclude;
}>;

/** Days between waterings on a given day: the user's, or the card's. */
export function intervalOn(
  plant: Pick<
    PlantWithSpecies,
    | 'species'
    | 'spot'
    | 'pot'
    | 'wateringIntervalDays'
    | 'wateringIntervalCustom'
  >,
  at = new Date(),
) {
  return plant.wateringIntervalCustom || !plant.species
    ? plant.wateringIntervalDays
    : suggestedInterval(plant.species, plant.spot, plant.pot, at);
}

export function wateringState(plant: PlantWithSpecies, now = new Date()) {
  const from = plant.lastWateredAt ?? plant.createdAt;
  const next = new Date(from.getTime() + intervalOn(plant, now) * DAY_MS);
  return {
    lastWateredAt: plant.lastWateredAt,
    nextWateringAt: next,
    dueInDays: Math.ceil((next.getTime() - now.getTime()) / DAY_MS),
  };
}

const LIGHT_ORDER: LightLevel[] = [
  'LOW',
  'PARTIAL',
  'BRIGHT_INDIRECT',
  'DIRECT',
];
const LIGHT_NAME: Record<LightLevel, string> = {
  LOW: 'az ışık',
  PARTIAL: 'orta ışık',
  BRIGHT_INDIRECT: 'parlak, dolaylı ışık',
  DIRECT: 'doğrudan güneş',
};
const SPOT_NAME: Record<PlantSpot, string> = {
  INDOOR: 'iç mekân',
  BALCONY: 'balkon',
  GARDEN: 'bahçe',
};

/** Where the plant stands against what its card asks for. */
export function placementTips(plant: PlantWithSpecies): string[] {
  const species = plant.species;
  if (!species) return [];
  const tips: string[] = [];
  if (plant.light) {
    const need = LIGHT_ORDER.indexOf(species.light);
    const has = LIGHT_ORDER.indexOf(plant.light);
    if (has < need) {
      tips.push(
        `${species.turkishName} ${LIGHT_NAME[species.light]} ister; bulunduğu yer daha karanlık. Pencereye yaklaştırmayı dene, az ışıkta büyümesi yavaşlar.`,
      );
    } else if (plant.light === 'DIRECT' && species.light !== 'DIRECT') {
      tips.push(
        'Doğrudan güneş yapraklarını yakabilir. Tül perde arkasına ya da öğle güneşi almayan bir yere al.',
      );
    }
  }
  if (!species.spots.includes(plant.spot)) {
    tips.push(
      `Bu tür genellikle ${species.spots.map((spot) => SPOT_NAME[spot]).join(' ya da ')} için önerilir; ${SPOT_NAME[plant.spot]} koşullarını yakından izle.`,
    );
  }
  if (plant.spot !== 'INDOOR' && species.tempMinC >= 5) {
    tips.push(
      `Gece sıcaklığı ${species.tempMinC} °C'nin altına düşmeden içeri al.`,
    );
  }
  if (plant.pot === 'SELF_WATERING') {
    tips.push(
      'Kendinden sulamalı saksıda haznenin dolu olduğunu kontrol et; toprağı ayrıca sulamana gerek yok.',
    );
  }
  return tips;
}

export const toMyPlant = (plant: PlantWithSpecies, now = new Date()) => ({
  id: plant.id,
  nickname: plant.nickname,
  spot: plant.spot,
  light: plant.light,
  pot: plant.pot,
  scientificName: plant.species?.scientificName ?? plant.scientificName,
  species: plant.species
    ? {
        id: plant.species.id,
        name: plant.species.turkishName,
        toxicToPets: plant.species.toxicToPets,
      }
    : null,
  wateringIntervalDays: intervalOn(plant, now),
  wateringIntervalCustom: plant.wateringIntervalCustom,
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
        light: body.light ?? null,
        pot: body.pot ?? null,
        wateringIntervalDays:
          body.wateringIntervalDays ??
          suggestedInterval(species, body.spot, body.pot ?? null),
        wateringIntervalCustom: body.wateringIntervalDays !== undefined,
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
      tips: placementTips(plant),
      careEvents,
      scans,
    };
  }

  async update(caller: AuthUser, id: number, body: UpdatePlantBody) {
    const current = await this.owned(caller, id);
    const { wateringIntervalDays, ...fields } = body;
    const plant = await this.prisma.userPlant.update({
      where: { id },
      data: {
        ...fields,
        ...(wateringIntervalDays === undefined
          ? {}
          : wateringIntervalDays === null
            ? {
                wateringIntervalCustom: false,
                wateringIntervalDays: suggestedInterval(
                  current.species,
                  fields.spot ?? current.spot,
                  fields.pot === undefined ? current.pot : fields.pot,
                ),
              }
            : { wateringIntervalDays, wateringIntervalCustom: true }),
      },
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

  /**
   * Waterings over the next `days` Istanbul days, for the reminders the
   * phone schedules itself (one notification a day, not one per plant).
   * Overdue plants count for today; later dates assume they are watered
   * on time.
   */
  async schedule(caller: AuthUser, days: number) {
    const [plants, user] = await Promise.all([
      this.prisma.userPlant.findMany({
        where: { userId: caller.id, archivedAt: null },
        include: plantInclude,
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: caller.id },
        select: { reminderMinute: true },
      }),
    ]);
    const now = new Date();
    const start = istanbulDayStart(now);
    const end = new Date(start.getTime() + days * DAY_MS);
    const byDay = new Map<
      string,
      { id: number; nickname: string; overdue: boolean }[]
    >();
    for (const plant of plants) {
      const { nextWateringAt } = wateringState(plant, now);
      const overdue = nextWateringAt < start;
      let at = overdue ? start : nextWateringAt;
      let first = true;
      while (at < end) {
        const date = istanbulDate(at);
        byDay.set(date, [
          ...(byDay.get(date) ?? []),
          { id: plant.id, nickname: plant.nickname, overdue: first && overdue },
        ]);
        at = new Date(at.getTime() + intervalOn(plant, at) * DAY_MS);
        first = false;
      }
    }
    return {
      reminderMinute: user.reminderMinute,
      days: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, due]) => ({ date, plants: due })),
    };
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
