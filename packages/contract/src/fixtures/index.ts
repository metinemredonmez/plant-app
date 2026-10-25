import {readFileSync} from 'node:fs';

import type {
  LegacyBanner,
  LegacyCategory,
  LegacyColor,
  LegacyOrder,
  LegacyPlant,
  LegacyPlantType,
  LegacyPotType,
  LegacyPromocode,
  LegacyReview,
  LegacySlide,
  LegacyUser,
} from '../schemas.js';

export interface Fixtures {
  plants: LegacyPlant[];
  categories: LegacyCategory[];
  colors: LegacyColor[];
  potTypes: LegacyPotType[];
  plantTypes: LegacyPlantType[];
  slides: LegacySlide[];
  banners: LegacyBanner[];
  promocodes: LegacyPromocode[];
  users: LegacyUser[];
  /** Keyed by user id */
  orders: Record<string, LegacyOrder[]>;
  /** Keyed by plant id */
  reviews: Record<string, LegacyReview[]>;
}

const read = <T>(file: string): T => JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'));

/** Returns a fresh deep copy on every call, so callers may mutate it. */
export function loadFixtures(): Fixtures {
  const catalog = read<Omit<Fixtures, 'plants' | 'users' | 'orders' | 'reviews'>>('catalog.json');
  const accounts = read<Pick<Fixtures, 'users' | 'orders' | 'reviews'>>('accounts.json');
  return {plants: read<LegacyPlant[]>('plants.json'), ...catalog, ...accounts};
}

/** Image paths in fixtures are relative ("/images/x.jpg") */
export const IMAGE_PREFIX = '/images/';
