import { createHash } from 'node:crypto';

import sharp from 'sharp';

/** Longest edge kept and sent to the provider (Kindwise suggests 1–2 MP). */
export const MAX_EDGE = 1280;

/** What the client may send. HEIC is not decoded by sharp's prebuilt binaries;
 * the app converts every photo to JPEG before upload. */
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface CleanPhoto {
  data: Buffer;
  mimeType: 'image/jpeg';
  /** Of the cleaned bytes: the same photo sent twice has the same hash. */
  sha256: string;
}

/**
 * Re-encodes an upload as a JPEG of at most MAX_EDGE pixels. Orientation is
 * applied to the pixels first; sharp then writes no metadata at all, so EXIF,
 * GPS and camera details never reach storage or a provider, even when the
 * client forgot to strip them. Returns null when the bytes are not an image.
 */
export async function cleanPhoto(input: Buffer): Promise<CleanPhoto | null> {
  try {
    const data = await sharp(input)
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return {
      data,
      mimeType: 'image/jpeg',
      sha256: createHash('sha256').update(data).digest('hex'),
    };
  } catch {
    return null;
  }
}
