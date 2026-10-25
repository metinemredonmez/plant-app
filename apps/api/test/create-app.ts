import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { configureApp } from '../src/configure-app.js';

/**
 * Boots the real AppModule the way main.ts does. AppModule is imported
 * lazily so a spec can change process.env (e.g. AUTH_RATE_LIMIT) first.
 */
export async function createTestApp() {
  const { AppModule } = await import('../src/app.module.js');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = configureApp(
    moduleRef.createNestApplication<NestExpressApplication>(),
  );
  await app.init();
  return app;
}
