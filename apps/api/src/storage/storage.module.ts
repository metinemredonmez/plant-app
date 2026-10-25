import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { ImageStorage, LocalImageStorage } from './image-storage.js';

// Scan photos (personal data). Local folder in development; R2 in week 3
// of the plan, with signed uploads and EXIF removal.
@Global()
@Module({
  providers: [
    {
      provide: ImageStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new LocalImageStorage(config.get('UPLOAD_DIR', { infer: true })),
    },
  ],
  exports: [ImageStorage],
})
export class StorageModule {}
