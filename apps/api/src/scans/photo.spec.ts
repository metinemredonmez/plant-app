import sharp from 'sharp';

import { cleanPhoto, MAX_EDGE } from './photo.js';

const withGps = () =>
  sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: { r: 40, g: 150, b: 60 },
    },
  })
    .withExif({
      IFD0: { Make: 'Telefon', Model: 'Test' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '41/1 0/1 54/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '28/1 58/1 34/1',
      },
    })
    .jpeg()
    .toBuffer();

describe('cleanPhoto', () => {
  it('drops EXIF and GPS and shrinks to the longest edge', async () => {
    const input = await withGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const photo = await cleanPhoto(input);
    const meta = await sharp(photo!.data).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(Math.max(meta.width, meta.height)).toBe(MAX_EDGE);
    expect(photo!.mimeType).toBe('image/jpeg');
  });

  it('gives the same hash for the same photo', async () => {
    const input = await withGps();
    const [a, b] = await Promise.all([cleanPhoto(input), cleanPhoto(input)]);
    expect(a!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(a!.sha256).toBe(b!.sha256);
  });

  it('never enlarges and rejects bytes that are not an image', async () => {
    const small = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#2e7d32' },
    })
      .png()
      .toBuffer();
    const meta = await sharp((await cleanPhoto(small))!.data).metadata();
    expect([meta.width, meta.height]).toEqual([300, 200]);

    expect(await cleanPhoto(Buffer.from('not an image'))).toBeNull();
  });
});
