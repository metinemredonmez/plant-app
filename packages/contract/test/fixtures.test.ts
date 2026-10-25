import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {test} from 'node:test';

import {IMAGE_PREFIX, loadFixtures, responseSchemas} from '../src/index.js';

const fixtures = loadFixtures();

test('fixtures match the wire schemas the app reads', () => {
  responseSchemas.GET_PLANTS.parse(fixtures.plants);
  responseSchemas.GET_CATEGORIES.parse(fixtures.categories);
  responseSchemas.GET_COLORS.parse(fixtures.colors);
  responseSchemas.GET_POT_TYPES.parse(fixtures.potTypes);
  responseSchemas.GET_PLANT_TYPES.parse(fixtures.plantTypes);
  responseSchemas.GET_CAROUSEL.parse(fixtures.slides);
  responseSchemas.GET_BANNERS.parse(fixtures.banners);
  responseSchemas.GET_PROMOCODES.parse(fixtures.promocodes);
  for (const user of fixtures.users) responseSchemas.GET_USER.parse(user);
  for (const orders of Object.values(fixtures.orders)) responseSchemas.GET_ORDERS.parse({orders});
  for (const reviews of Object.values(fixtures.reviews)) responseSchemas.GET_REVIEWS.parse({reviews});
});

test('ids are unique within each collection', () => {
  const collections = {
    plants: fixtures.plants,
    categories: fixtures.categories,
    colors: fixtures.colors,
    potTypes: fixtures.potTypes,
    plantTypes: fixtures.plantTypes,
    slides: fixtures.slides,
    banners: fixtures.banners,
    promocodes: fixtures.promocodes,
    orders: Object.values(fixtures.orders).flat(),
    reviews: Object.values(fixtures.reviews).flat(),
  };
  for (const [name, items] of Object.entries(collections)) {
    const ids = items.map(item => item.id);
    assert.equal(new Set(ids).size, ids.length, `${name} has duplicate ids`);
  }
});

test('plant relations use names that exist in the lookup lists', () => {
  const names = (items: {name: string}[]) => new Set(items.map(item => item.name));
  const lookups = {
    categories: names(fixtures.categories),
    colors: names(fixtures.colors),
    potTypes: names(fixtures.potTypes),
    plantTypes: names(fixtures.plantTypes),
  };
  for (const plant of fixtures.plants) {
    for (const [field, known] of Object.entries(lookups)) {
      for (const value of plant[field as keyof typeof lookups]) {
        assert.ok(known.has(value), `${plant.name}: unknown ${field} "${value}"`);
      }
    }
  }
});

test('every slide and banner promotion has products', () => {
  // Home shows an alert instead of a shop list when a promotion is empty.
  for (const promo of [...fixtures.slides, ...fixtures.banners].map(item => item.promotion)) {
    assert.ok(
      fixtures.plants.some(plant => plant.promotion === promo),
      `promotion "${promo}" has no plants`,
    );
  }
});

test('order lines and reviews point at real plants', () => {
  const plantIds = new Set(fixtures.plants.map(plant => plant.id));
  for (const order of Object.values(fixtures.orders).flat()) {
    for (const line of order.products) assert.ok(plantIds.has(line.id), `order ${order.id}: unknown plant ${line.id}`);
  }
  for (const plantId of Object.keys(fixtures.reviews)) assert.ok(plantIds.has(Number(plantId)));
});

test('every referenced image exists', () => {
  const images = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === 'string' && value.startsWith(IMAGE_PREFIX)) images.add(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(fixtures);
  assert.ok(images.size > 0);
  for (const image of images) {
    assert.ok(existsSync(new URL(`../mock/public${image}`, import.meta.url)), `missing ${image}`);
  }
});
