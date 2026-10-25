// Seeds the development catalog from prisma/seed-data.ts. Idempotent and
// non-destructive: lookups, suppliers, promocodes, plants, accounts and
// reviews are upserted by their natural keys, so it can run against an
// existing database any time. Run with `pnpm db:seed`.
import { randomBytes } from 'node:crypto';

import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import {
  type OrderStatus,
  PrismaClient,
  type User,
} from '../src/generated/prisma/client.js';
import * as data from './seed-data.js';

config({ quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const kurus = (tl: number) => Math.round(tl * 100);
const byName = (names: string[]) => names.map((name) => ({ name }));
/** Dates are Istanbul time; promocodes expire at the end of the day. */
const istanbul = (date: string, time = '12:00:00') =>
  new Date(`${date}T${time}+03:00`);

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

/** Creates a paid order at catalog prices for the given plants. */
async function createOrder(
  user: User,
  order: {
    status: OrderStatus;
    createdAt: Date;
    lines: { slug: string; quantity: number; color?: string }[];
  },
) {
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
      phoneNumber: user.phoneNumber ?? '+905550000000',
      email: user.email,
      subtotalKurus: total,
      totalKurus: total,
      createdAt: order.createdAt,
      items: { create: items },
    },
  });
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
  if ((await prisma.order.count({ where: { userId: user.id } })) === 0) {
    for (const order of data.demoOrders) {
      await createOrder(user, {
        ...order,
        createdAt: new Date(order.createdAt),
      });
    }
  }
  return user;
}

async function seedPromocodes(demoUser: User) {
  for (const promo of data.promocodes) {
    const fields = {
      discountPercent: promo.discountPercent,
      expiresAt: istanbul(promo.expiresAt, '23:59:59'),
      userId: promo.forDemoUser ? demoUser.id : null,
      usageLimit: promo.usageLimit ?? null,
      usedCount: promo.usedCount ?? 0,
    };
    await prisma.promocode.upsert({
      where: { code: promo.code },
      create: { code: promo.code, ...fields },
      update: fields,
    });
  }
}

async function seedReviews() {
  for (const reviewer of data.sampleReviewers) {
    const user = await prisma.user.upsert({
      where: { email: reviewer.email },
      // Random password: sample customers cannot log in.
      create: {
        name: reviewer.name,
        email: reviewer.email,
        passwordHash: await hash(randomBytes(32).toString('hex')),
        emailVerified: true,
      },
      update: {},
    });
    // The delivered order that makes each review a verified purchase.
    if ((await prisma.order.count({ where: { userId: user.id } })) === 0) {
      const first = [...reviewer.reviews].sort((a, b) =>
        a.date.localeCompare(b.date),
      )[0];
      await createOrder(user, {
        status: 'delivered',
        createdAt: new Date(istanbul(first.date).getTime() - 7 * 86_400_000),
        lines: reviewer.reviews.map((review) => ({
          slug: review.slug,
          quantity: 1,
        })),
      });
    }
    for (const review of reviewer.reviews) {
      const plant = await prisma.plant.findUniqueOrThrow({
        where: { slug: review.slug },
      });
      const fields = {
        rating: review.rating,
        comment: review.comment,
        createdAt: istanbul(review.date),
      };
      await prisma.review.upsert({
        where: { userId_plantId: { userId: user.id, plantId: plant.id } },
        create: { userId: user.id, plantId: plant.id, ...fields },
        update: fields,
      });
    }
  }
}

/** Same rule as the API (refreshPlantRating), for every plant at once. */
async function refreshRatings() {
  const stats = await prisma.review.groupBy({
    by: ['plantId'],
    where: { hidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.plant.updateMany({
    where: { id: { notIn: stats.map((s) => s.plantId) } },
    data: { ratingAvg: 0, ratingCount: 0 },
  });
  for (const stat of stats) {
    await prisma.plant.update({
      where: { id: stat.plantId },
      data: { ratingAvg: stat._avg.rating ?? 0, ratingCount: stat._count },
    });
  }
}

await seedLookups();
await seedMarketing();
await seedPlants();
const demoUser = await seedDemoAccount();
await seedPromocodes(demoUser);
await seedReviews();
await refreshRatings();

const [plants, promocodes, orders, reviews] = await Promise.all([
  prisma.plant.count(),
  prisma.promocode.count(),
  prisma.order.count(),
  prisma.review.count(),
]);
console.log(
  `Seeded ${plants} plants, ${promocodes} promocodes, ${orders} orders, ${reviews} reviews`,
);
await prisma.$disconnect();
