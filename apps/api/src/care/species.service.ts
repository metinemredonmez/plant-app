import { Injectable, NotFoundException } from '@nestjs/common';

import type { PlantSpecies, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { scientificKey } from './scientific-name.js';

/** The public card. Internal fields (source flags) stay on the server. */
export const toCard = (species: PlantSpecies) => ({
  id: species.id,
  scientificName: species.scientificName,
  name: species.turkishName,
  otherNames: species.otherNames,
  family: species.family,
  light: species.light,
  difficulty: species.difficulty,
  water: {
    summerDays: species.waterSummerDays,
    winterDays: species.waterWinterDays,
    tip: species.wateringTip,
  },
  humidity: species.humidity,
  temperature: { minC: species.tempMinC, maxC: species.tempMaxC },
  pets: { toxic: species.toxicToPets, note: species.toxicityNote },
  summary: species.summary,
  lightTip: species.lightTip,
  fertilizingTip: species.fertilizingTip,
  commonProblems: species.commonProblems,
  spots: species.spots,
  reviewed: species.reviewed,
});

export type CareCard = ReturnType<typeof toCard>;

/** Drafts from the language model stay out of the app until approved. */
const PUBLISHED = { status: 'PUBLISHED' } as const;

@Injectable()
export class SpeciesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q?: string) {
    const term = q?.trim();
    const where: Prisma.PlantSpeciesWhereInput = term
      ? {
          ...PUBLISHED,
          OR: [
            { turkishName: { contains: term, mode: 'insensitive' } },
            { scientificName: { contains: term, mode: 'insensitive' } },
            { otherNames: { has: term } },
          ],
        }
      : PUBLISHED;
    const rows = await this.prisma.plantSpecies.findMany({
      where,
      orderBy: { turkishName: 'asc' },
    });
    return rows.map(toCard);
  }

  async card(id: number) {
    const species = await this.prisma.plantSpecies.findFirst({
      where: { id, ...PUBLISHED },
    });
    if (!species) throw new NotFoundException('Bitki bulunamadı');
    return toCard(species);
  }

  /**
   * Care card for an identification result: exact scientific name, a
   * synonym, or a genus-level card ("Begonia" for "Begonia rex").
   */
  async match(scientificName: string): Promise<PlantSpecies | null> {
    const name = scientificKey(scientificName);
    const genus = name.split(' ')[0];
    const all = await this.prisma.plantSpecies.findMany({ where: PUBLISHED });
    const names = (s: PlantSpecies) =>
      [s.scientificName, ...s.synonyms].map(scientificKey);
    return (
      all.find((s) => names(s).includes(name)) ??
      all.find((s) => names(s).includes(genus)) ??
      null
    );
  }

  /** Turkish name from Wikidata for a species without a care card. */
  plantName(scientificName: string) {
    return this.prisma.plantName.findUnique({
      where: { nameKey: scientificKey(scientificName) },
    });
  }
}
