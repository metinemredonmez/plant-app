import {
  assetUrlBuilder,
  type PlantWithRelations,
  toLegacyCategory,
  toLegacyPlant,
} from './legacy.mapper.js';

const assetUrl = assetUrlBuilder('https://cdn.test/images');

function plant(
  overrides: Partial<PlantWithRelations> = {},
): PlantWithRelations {
  return {
    id: 7,
    slug: 'monstera-deliciosa-40-50',
    name: 'Monstera Deliciosa 40-50 cm',
    latinName: 'Monstera deliciosa',
    description: 'Açıklama',
    priceKurus: 74950,
    oldPriceKurus: 89900,
    stock: 3,
    heightMinCm: 40,
    heightMaxCm: 50,
    light: 'BRIGHT_INDIRECT',
    difficulty: 'EASY',
    petSafe: false,
    airPurifying: true,
    wateringNote: 'Haftada bir',
    istanbulOnly: false,
    isBestSeller: true,
    isFeatured: false,
    isNew: false,
    isTop: true,
    promotion: null,
    ratingAvg: 4.6666,
    ratingCount: 3,
    active: true,
    passportNo: null,
    supplierId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [
      { id: 1, plantId: 7, key: 'a.jpg', sort: 0 },
      { id: 2, plantId: 7, key: 'https://elsewhere.test/b.jpg', sort: 1 },
    ],
    categories: [{ name: 'Salon Bitkileri' }],
    colors: [{ name: 'Beyaz' }, { name: 'Terrakota' }],
    potTypes: [{ name: 'Seramik' }],
    plantTypes: [{ name: 'Yapraklı' }],
    ...overrides,
  };
}

describe('toLegacyPlant', () => {
  it('converts kuruş to TL numbers and rounds the rating', () => {
    const legacy = toLegacyPlant(plant(), assetUrl);
    expect(legacy.price).toBe(749.5);
    expect(legacy.oldPrice).toBe(899);
    expect(legacy.rating).toBe(4.7);
  });

  it('omits oldPrice unless it is above the price', () => {
    expect(
      toLegacyPlant(plant({ oldPriceKurus: null }), assetUrl),
    ).not.toHaveProperty('oldPrice');
    expect(
      toLegacyPlant(plant({ oldPriceKurus: 0 }), assetUrl),
    ).not.toHaveProperty('oldPrice');
    expect(
      toLegacyPlant(plant({ oldPriceKurus: 74950 }), assetUrl),
    ).not.toHaveProperty('oldPrice');
  });

  it('flattens relations to name arrays and builds image URLs', () => {
    const legacy = toLegacyPlant(plant(), assetUrl);
    expect(legacy.colors).toEqual(['Beyaz', 'Terrakota']);
    expect(legacy.image).toBe('https://cdn.test/images/a.jpg');
    expect(legacy.images).toEqual([
      'https://cdn.test/images/a.jpg',
      'https://elsewhere.test/b.jpg',
    ]);
  });

  it('sends an empty promotion instead of null', () => {
    expect(toLegacyPlant(plant(), assetUrl).promotion).toBe('');
  });

  it('labels care attributes in Turkish', () => {
    const legacy = toLegacyPlant(plant(), assetUrl);
    expect(legacy).toMatchObject({
      heightCm: '40-50',
      light: 'Parlak, dolaylı ışık',
      careLevel: 'Kolay',
    });
  });
});

describe('toLegacyCategory', () => {
  it('omits a missing image so the app shows its placeholder', () => {
    const category = {
      id: 1,
      name: 'Kolay Bakım',
      sort: 0,
      createdAt: new Date(),
    };
    expect(toLegacyCategory({ ...category, image: null }, assetUrl)).toEqual({
      id: 1,
      name: 'Kolay Bakım',
    });
  });
});
