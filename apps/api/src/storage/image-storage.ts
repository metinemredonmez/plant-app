import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

// The scan service cleans every photo to JPEG before storing it.
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
};

const folder = (userPublicId: string) => `scans/${userPublicId}`;
const newKey = (userPublicId: string, mimeType: string) =>
  `${folder(userPublicId)}/${randomUUID()}.${EXTENSIONS[mimeType] ?? 'bin'}`;

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

/** Development and tests: a local folder (gitignored). */
export class LocalImageStorage extends ImageStorage {
  constructor(private readonly dir: string) {
    super();
  }

  async put(userPublicId: string, data: Buffer, mimeType: string) {
    const key = newKey(userPublicId, mimeType);
    await mkdir(resolve(join(this.dir, folder(userPublicId))), {
      recursive: true,
    });
    await writeFile(resolve(join(this.dir, key)), data);
    return key;
  }

  async removeAll(userPublicId: string) {
    await rm(resolve(join(this.dir, folder(userPublicId))), {
      recursive: true,
      force: true,
    });
  }
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/**
 * Production: a private Cloudflare R2 bucket through its S3 API, set up as
 * in Cloudflare's aws-sdk-js-v3 example. No public URLs. Not yet run
 * against a live bucket.
 */
export class R2ImageStorage extends ImageStorage {
  constructor(
    private readonly bucket: string,
    private readonly client: S3Client,
  ) {
    super();
  }

  static connect(config: R2Config) {
    return new R2ImageStorage(
      config.bucket,
      new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    );
  }

  async put(userPublicId: string, data: Buffer, mimeType: string) {
    const key = newKey(userPublicId, mimeType);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  /** Lists and deletes page by page (both cap at 1,000 keys a request). */
  async removeAll(userPublicId: string) {
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${folder(userPublicId)}/`,
          ContinuationToken: token,
        }),
      );
      const objects = (page.Contents ?? []).flatMap((object) =>
        object.Key ? [{ Key: object.Key }] : [],
      );
      if (objects.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects, Quiet: true },
          }),
        );
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
}
