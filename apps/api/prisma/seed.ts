// Seeds the development catalog from prisma/seed-data.ts. Idempotent and
// non-destructive: lookups, suppliers, plants, care cards and the demo
// account are upserted by their natural keys, so it can run against an
// existing database any time. Run with `pnpm db:seed`.

import { readFile } from 'node:fs/promises';

import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import { PrismaClient, type User } from '../src/generated/prisma/client.js';
import { scientificKey } from '../src/care/scientific-name.js';
import * as data from './seed-data.js';
import { species, SPECIES_SOURCE } from './species-data.js';
import type { NameEntry } from './wikidata/fetch-tr-names.js';

config({ quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const kurus = (tl: number) => Math.round(tl * 100);
const byName = (names: string[]) => names.map((name) => ({ name }));

async function seedLookups() {
  for (const [sort, category] of data.categories.entries()) {
    await prisma.category.upsert({
      where: { name: category.name },
      create: { ...category, sort },
      update: { image: category.image, sort },
    });
  }
  for (const color of data.colors) {
    await prisma.color.upsert({
      where: { name: color.name },
      create: color,
      update: { code: color.code },
    });
  }
  for (const name of data.potTypes) {
    await prisma.potType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  for (const name of data.plantTypes) {
    await prisma.plantType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  for (const supplier of data.suppliers) {
    await prisma.supplier.upsert({
      where: { name: supplier.name },
      create: supplier,
      update: { city: supplier.city },
    });
  }
}

async function seedMarketing() {
  // Slides and banners have no natural key: only fill an empty table, so
  // edits made later in the admin panel are never overwritten.
  if ((await prisma.slide.count()) === 0) {
    await prisma.slide.createMany({
      data: data.slides.map((slide, sort) => ({ ...slide, sort })),
    });
  }
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: data.banners.map((banner, sort) => ({ ...banner, sort })),
    });
  }
}

async function seedPlants() {
  for (const plant of data.plants) {
    const flags = new Set(plant.flags);
    // Ratings are not seeded: refreshRatings() derives them from reviews.
    const fields = {
      name: plant.name,
      latinName: plant.latinName ?? null,
      description: plant.description,
      priceKurus: kurus(plant.price),
      oldPriceKurus: plant.oldPrice ? kurus(plant.oldPrice) : null,
      stock: plant.stock,
      heightMinCm: plant.height[0],
      heightMaxCm: plant.height[1],
      light: plant.light,
      difficulty: plant.difficulty,
      petSafe: plant.petSafe,
      airPurifying: plant.airPurifying ?? null,
      wateringNote: plant.watering,
      istanbulOnly: plant.istanbulOnly ?? false,
      isBestSeller: flags.has('bestSeller'),
      isFeatured: flags.has('featured'),
      isNew: flags.has('new'),
      isTop: flags.has('top'),
      promotion: plant.promotion ?? null,
      supplier: { connect: { name: plant.supplier } },
    };
    const images = plant.images.map((key, sort) => ({ key, sort }));

    await prisma.plant.upsert({
      where: { slug: plant.slug },
      create: {
        slug: plant.slug,
        ...fields,
        categories: { connect: byName(plant.categories) },
        colors: { connect: byName(plant.colors) },
        potTypes: { connect: byName(plant.potTypes) },
        plantTypes: { connect: byName(plant.plantTypes) },
        images: { create: images },
      },
      update: {
        ...fields,
        categories: { set: byName(plant.categories) },
        colors: { set: byName(plant.colors) },
        potTypes: { set: byName(plant.potTypes) },
        plantTypes: { set: byName(plant.plantTypes) },
        images: { deleteMany: {}, create: images },
      },
    });
  }
}

async function seedDemoAccount() {
  const { password, ...profile } = data.demoUser;
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    // Never reset a password the developer may have changed.
    create: {
      ...profile,
      passwordHash: await hash(password),
      emailVerified: true,
      phoneVerified: true,
    },
    update: {},
  });
  return user;
}

/**
 * The demo account's plants, only if it has none: one overdue for water,
 * one due soon, one on the balcony, so the home screen has something to do.
 */
async function seedDemoGarden(user: User) {
  if ((await prisma.userPlant.count({ where: { userId: user.id } })) > 0)
    return;
  for (const plant of data.demoPlants) {
    const species = await prisma.plantSpecies.findUniqueOrThrow({
      where: { scientificName: plant.scientificName },
    });
    await prisma.userPlant.create({
      data: {
        userId: user.id,
        speciesId: species.id,
        nickname: plant.nickname,
        spot: plant.spot,
        wateringIntervalDays: plant.wateringIntervalDays,
        lastWateredAt: new Date(Date.now() - plant.wateredDaysAgo * 86_400_000),
      },
    });
  }
}

/** Care cards; `reviewed` is never reset once an expert has set it. */
/** Wikidata names and ids (CC0), refreshed with `pnpm species:names`. */
async function wikidataNames() {
  const file = new URL('./wikidata/tr-names.json', import.meta.url);
  const { species: entries } = JSON.parse(await readFile(file, 'utf8')) as {
    species: NameEntry[];
  };
  return new Map(entries.map((e) => [scientificKey(e.scientificName), e]));
}

async function seedSpecies(names: Map<string, NameEntry>) {
  for (const { synonyms = [], toxicityNote, ...card } of species) {
    const ids = names.get(scientificKey(card.scientificName));
    const fields = {
      ...card,
      synonyms,
      toxicityNote: toxicityNote ?? null,
      source: SPECIES_SOURCE,
      wikidataId: ids?.wikidataId ?? null,
      gbifId: ids?.gbifId ?? null,
      powoId: ids?.powoId ?? null,
    };
    await prisma.plantSpecies.upsert({
      where: { scientificName: card.scientificName },
      create: fields,
      update: fields,
    });
  }
}

async function seedPlantNames(names: Map<string, NameEntry>) {
  for (const [nameKey, entry] of names) {
    if (!entry.turkishName || !entry.wikidataId) continue;
    const fields = {
      scientificName: entry.scientificName,
      turkishName: entry.turkishName,
      otherNames: entry.otherNames,
      wikidataId: entry.wikidataId,
      gbifId: entry.gbifId,
      powoId: entry.powoId,
    };
    await prisma.plantName.upsert({
      where: { nameKey },
      create: { nameKey, ...fields },
      update: fields,
    });
  }
}

const names = await wikidataNames();
await seedLookups();
await seedSpecies(names);
await seedPlantNames(names);
await seedMarketing();
await seedPlants();
const demoUser = await seedDemoAccount();
await seedDemoGarden(demoUser);
// Reviews left with the plant store; nothing rates plants any more.
await prisma.plant.updateMany({ data: { ratingAvg: 0, ratingCount: 0 } });

const [speciesCount, nameCount, plants, userPlants] = await Promise.all([
  prisma.plantSpecies.count(),
  prisma.plantName.count(),
  prisma.plant.count(),
  prisma.userPlant.count(),
]);
console.log(
  `Seeded ${speciesCount} care cards, ${nameCount} Turkish plant names, ${plants} catalog plants, ${userPlants} user plants`,
);
await prisma.$disconnect();
