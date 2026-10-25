// Seeds the development catalog from prisma/seed-data.ts. Idempotent and
// non-destructive: lookups, suppliers, promocodes and plants are upserted by
// their natural keys, so it can run against an existing database any time.
// Run with `pnpm db:seed`.
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/prisma/client.js';
import * as data from './seed-data.js';

config({ quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const kurus = (tl: number) => Math.round(tl * 100);
const byName = (names: string[]) => names.map((name) => ({ name }));
/** Promocodes expire at the end of the day, Istanbul time. */
const endOfDay = (date: string) => new Date(`${date}T23:59:59+03:00`);

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
  for (const promo of data.promocodes) {
    const fields = {
      discountPercent: promo.discountPercent,
      expiresAt: endOfDay(promo.expiresAt),
    };
    await prisma.promocode.upsert({
      where: { code: promo.code },
      create: { code: promo.code, ...fields },
      update: fields,
    });
  }
}

async function seedPlants() {
  for (const plant of data.plants) {
    const flags = new Set(plant.flags);
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
      ratingAvg: plant.rating,
      ratingCount: plant.ratingCount,
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

async function seedAccounts() {
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
  if ((await prisma.order.count({ where: { userId: user.id } })) > 0) return;

  for (const order of data.demoOrders) {
    const plants = await prisma.plant.findMany({
      where: { slug: { in: order.lines.map((line) => line.slug) } },
    });
    const items = order.lines.map((line) => {
      const plant = plants.find((p) => p.slug === line.slug)!;
      return {
        plantId: plant.id,
        nameSnapshot: plant.name,
        unitPriceKurus: plant.priceKurus,
        quantity: line.quantity,
        color: line.color,
      };
    });
    const total = items.reduce(
      (sum, item) => sum + item.unitPriceKurus * item.quantity,
      0,
    );
    await prisma.order.create({
      data: {
        userId: user.id,
        status: order.status,
        paymentStatus: 'PAID',
        recipientName: user.name,
        address: 'Moda Cd. 1, Kadıköy, İstanbul',
        phoneNumber: profile.phoneNumber,
        email: user.email,
        subtotalKurus: total,
        totalKurus: total,
        createdAt: new Date(order.createdAt),
        items: { create: items },
      },
    });
  }
}

await seedLookups();
await seedMarketing();
await seedPlants();
await seedAccounts();

const [plants, categories, promocodes, orders] = await Promise.all([
  prisma.plant.count(),
  prisma.category.count(),
  prisma.promocode.count(),
  prisma.order.count(),
]);
console.log(
  `Seeded ${plants} plants, ${categories} categories, ${promocodes} promocodes, ${orders} orders`,
);
await prisma.$disconnect();
