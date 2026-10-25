import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};
export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS);

/** Where scan photos are kept. Keys only in the database, never URLs. */
export abstract class ImageStorage {
  abstract put(
    userPublicId: string,
    data: Buffer,
    mimeType: string,
  ): Promise<string>;
  /** Account deletion: every photo of the user. */
  abstract removeAll(userPublicId: string): Promise<void>;
}

/** Development: a local folder (gitignored). Production: R2 (later). */
export class LocalImageStorage extends ImageStorage {
  constructor(private readonly dir: string) {
    super();
  }

  async put(userPublicId: string, data: Buffer, mimeType: string) {
    const key = `scans/${userPublicId}/${randomUUID()}.${EXTENSIONS[mimeType] ?? 'bin'}`;
    const path = resolve(join(this.dir, key));
    await mkdir(resolve(join(this.dir, 'scans', userPublicId)), {
      recursive: true,
    });
    await writeFile(path, data);
    return key;
  }

  async removeAll(userPublicId: string) {
    await rm(resolve(join(this.dir, 'scans', userPublicId)), {
      recursive: true,
      force: true,
    });
  }
}
