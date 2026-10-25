import { responseSchemas } from '@everbloom/contract';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp } from './create-app.js';

// Contract tests for the catalog endpoints: every response must parse with
// the shared zod schema the mock server is tested against, and its field
// layout is pinned by a snapshot so drift shows up in review. The snapshot
// records types, not data, so editing the seed does not break it.

const endpoints = [
  { name: 'GET_PLANTS', path: '/api/plants' },
  { name: 'GET_CATEGORIES', path: '/api/categories' },
  { name: 'GET_COLORS', path: '/api/colors' },
  { name: 'GET_POT_TYPES', path: '/api/pot/types' },
  { name: 'GET_PLANT_TYPES', path: '/api/plant/types' },
  { name: 'GET_CAROUSEL', path: '/api/slides' },
  { name: 'GET_BANNERS', path: '/api/banners' },
  { name: 'GET_PROMOCODES', path: '/api/promocodes' },
] as const;

const typeName = (value: unknown) =>
  value === undefined
    ? 'missing'
    : value === null
      ? 'null'
      : Array.isArray(value)
        ? 'array'
        : typeof value;

/** Every key across all items, with every type seen for it. */
function listShape(items: Record<string, unknown>[]) {
  const keys = [...new Set(items.flatMap((item) => Object.keys(item)))].sort();
  return Object.fromEntries(
    keys.map((key) => [
      key,
      [...new Set(items.map((item) => typeName(item[key])))].sort().join(' | '),
    ]),
  );
}

describe('catalog contract (e2e)', () => {
  let app: NestExpressApplication;
  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe.each(endpoints)('$path', ({ name, path }) => {
    it('answers 200 with a bare array in the shared schema', async () => {
      const res = await get(path).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      responseSchemas[name].parse(res.body);
    });

    it('keeps its field layout', async () => {
      const res = await get(path).expect(200);
      expect(listShape(res.body)).toMatchSnapshot();
    });
  });

  it('maps a plant the way the app reads it', async () => {
    const res = await get('/api/plants').expect(200);
    const monstera = res.body.find(
      (plant: { name: string }) => plant.name === 'Monstera Deliciosa 40-50 cm',
    );
    expect(monstera).toMatchObject({
      price: 749,
      oldPrice: 899,
      rating: 4.6,
      image: 'http://assets.test/images/monstera.jpg',
      categories: ['Salon Bitkileri'],
      colors: ['Beyaz', 'Terrakota'],
      promotion: 'kis-firsatlari',
      heightCm: '40-50',
      light: 'Parlak, dolaylı ışık',
    });
  });

  it('leaves sold-out plants out of the list', async () => {
    const res = await get('/api/plants').expect(200);
    const names = res.body.map((plant: { name: string }) => plant.name);
    expect(names).not.toContain('Kalathea Medaillon 40-50 cm');
    expect(res.body.every((plant: { stock: number }) => plant.stock > 0)).toBe(
      true,
    );
  });

  it('only uses relation names that exist in the lookup lists', async () => {
    const [plants, categories, colors, potTypes, plantTypes] =
      await Promise.all([
        get('/api/plants'),
        get('/api/categories'),
        get('/api/colors'),
        get('/api/pot/types'),
        get('/api/plant/types'),
      ]);
    const known = (res: { body: { name: string }[] }) =>
      new Set(res.body.map((item) => item.name));
    const lookups = {
      categories: known(categories),
      colors: known(colors),
      potTypes: known(potTypes),
      plantTypes: known(plantTypes),
    };
    for (const plant of plants.body) {
      for (const [field, names] of Object.entries(lookups)) {
        for (const name of plant[field]) {
          expect(names.has(name), `${plant.name}: ${field} "${name}"`).toBe(
            true,
          );
        }
      }
    }
  });

  it('has plants for every slide and banner promotion', async () => {
    const [plants, slides, banners] = await Promise.all([
      get('/api/plants'),
      get('/api/slides'),
      get('/api/banners'),
    ]);
    const promotions = new Set(
      plants.body.map((plant: { promotion: string }) => plant.promotion),
    );
    for (const { promotion } of [...slides.body, ...banners.body]) {
      expect(promotions.has(promotion), promotion).toBe(true);
    }
  });

  it('lists only public, unexpired promocodes', async () => {
    const res = await get('/api/promocodes').expect(200);
    expect(res.body.map((promo: { code: string }) => promo.code)).toEqual([
      'HOSGELDIN10',
      'BITKI20',
    ]);
  });
});
