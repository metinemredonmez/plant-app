import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import {
  ImageStorage,
  LocalImageStorage,
  R2ImageStorage,
} from './image-storage.js';

// Scan photos (personal data), always cleaned of EXIF before they get here
// (scans/photo.ts). Local folder in development, R2 in production.
@Global()
@Module({
  providers: [
    {
      provide: ImageStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        if (config.get('STORAGE_DRIVER', { infer: true }) === 'local') {
          return new LocalImageStorage(
            config.get('UPLOAD_DIR', { infer: true }),
          );
        }
        // env.ts guarantees the four R2 settings for STORAGE_DRIVER=r2.
        return R2ImageStorage.connect({
          accountId: config.get('R2_ACCOUNT_ID', { infer: true })!,
          accessKeyId: config.get('R2_ACCESS_KEY_ID', { infer: true })!,
          secretAccessKey: config.get('R2_SECRET_ACCESS_KEY', { infer: true })!,
          bucket: config.get('R2_BUCKET', { infer: true })!,
        });
      },
    },
  ],
  exports: [ImageStorage],
})
export class StorageModule {}
