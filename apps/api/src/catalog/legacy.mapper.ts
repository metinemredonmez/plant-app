import type {
  Banner,
  Category,
  Color,
  Difficulty,
  LightLevel,
  PlantType,
  PotType,
  Prisma,
  Slide,
} from '../generated/prisma/client.js';

// Mappers from database rows to the wire shapes the Expo app reads today.
// The rules they follow are documented in packages/contract/README.md and
// enforced by the contract tests in test/catalog.e2e-spec.ts.

/** Turns an image object key into a URL the device can load. */
export type AssetUrl = (key: string) => string;

export function assetUrlBuilder(baseUrl: string): AssetUrl {
  return (key) => (/^https?:\/\//.test(key) ? key : `${baseUrl}/${key}`);
}

export const plantInclude = {
  images: { orderBy: { sort: 'asc' } },
  categories: { select: { name: true }, orderBy: { sort: 'asc' } },
  colors: { select: { name: true }, orderBy: { id: 'asc' } },
  potTypes: { select: { name: true }, orderBy: { id: 'asc' } },
  plantTypes: { select: { name: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.PlantInclude;

export type PlantWithRelations = Prisma.PlantGetPayload<{
  include: typeof plantInclude;
}>;

const LIGHT_LABELS: Record<LightLevel, string> = {
  LOW: 'Az ışık',
  PARTIAL: 'Orta, dolaylı ışık',
  BRIGHT_INDIRECT: 'Parlak, dolaylı ışık',
  DIRECT: 'Bol, doğrudan ışık',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  NO_FUSS: 'Çok kolay',
  EASY: 'Kolay',
  MODERATE: 'Orta',
};

/** Money is stored in kuruş; the app expects TL numbers. */
const toLira = (kurus: number) => kurus / 100;
const names = (items: { name: string }[]) => items.map((item) => item.name);

export interface LegacyPlant {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  rating: number;
  image: string;
  images: string[];
  description: string;
  categories: string[];
  colors: string[];
  potTypes: string[];
  plantTypes: string[];
  promotion: string;
  isBestSeller: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isTop: boolean;
  // Extras the app does not read yet (care card and filters).
  latinName: string | null;
  heightCm: string | null;
  light: string | null;
  watering: string | null;
  careLevel: string | null;
  petSafe: boolean | null;
  istanbulOnly: boolean;
  stock: number;
}

export function toLegacyPlant(
  plant: PlantWithRelations,
  assetUrl: AssetUrl,
): LegacyPlant {
  const images = plant.images.map((image) => assetUrl(image.key));
  const { heightMinCm: min, heightMaxCm: max } = plant;
  return {
    id: plant.id,
    name: plant.name,
    price: toLira(plant.priceKurus),
    // Omitted unless it is a real markdown: ProductPrice renders
    // `{item.oldPrice && ...}`, so a 0 would crash the app.
    ...(plant.oldPriceKurus && plant.oldPriceKurus > plant.priceKurus
      ? { oldPrice: toLira(plant.oldPriceKurus) }
      : {}),
    rating: Math.round(plant.ratingAvg * 10) / 10,
    image: images[0] ?? '',
    images,
    description: plant.description,
    categories: names(plant.categories),
    colors: names(plant.colors),
    potTypes: names(plant.potTypes),
    plantTypes: names(plant.plantTypes),
    promotion: plant.promotion ?? '',
    isBestSeller: plant.isBestSeller,
    isFeatured: plant.isFeatured,
    isNew: plant.isNew,
    isTop: plant.isTop,
    latinName: plant.latinName,
    heightCm: min != null && max != null ? `${min}-${max}` : null,
    light: plant.light ? LIGHT_LABELS[plant.light] : null,
    watering: plant.wateringNote,
    careLevel: plant.difficulty ? DIFFICULTY_LABELS[plant.difficulty] : null,
    petSafe: plant.petSafe,
    istanbulOnly: plant.istanbulOnly,
    stock: plant.stock,
  };
}

export function toLegacyCategory(category: Category, assetUrl: AssetUrl) {
  return {
    id: category.id,
    name: category.name,
    // Omitted when unset so the app falls back to its placeholder image.
    ...(category.image ? { image: assetUrl(category.image) } : {}),
  };
}

export const toLegacyColor = ({ id, name, code }: Color) => ({
  id,
  name,
  code,
});

export const toLegacyLookup = ({ id, name }: PotType | PlantType) => ({
  id,
  name,
});

export const toLegacySlide = (slide: Slide, assetUrl: AssetUrl) => ({
  id: slide.id,
  image: assetUrl(slide.image),
  promotion: slide.promotion ?? '',
  title_line_1: slide.titleLine1,
  title_line_2: slide.titleLine2,
});

export const toLegacyBanner = (banner: Banner, assetUrl: AssetUrl) => ({
  id: banner.id,
  title: banner.title,
  title1: banner.title1 ?? '',
  title2: banner.title2 ?? '',
  image: assetUrl(banner.image),
  btnText: banner.btnText ?? '',
  promotion: banner.promotion ?? '',
  description1: banner.description1 ?? '',
  description2: banner.description2 ?? '',
});
