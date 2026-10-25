import { resolve } from 'node:path';

import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import type { Env } from './config/env.js';

/** Shared by main.ts and the e2e tests so both run the same app. */
export function configureApp(app: NestExpressApplication) {
  app.useLogger(app.get(Logger));
  // The Expo app calls `${BASE_URL}api/...`; health stays at the root for
  // load balancers and uptime checks.
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  // In production the API runs behind the host's proxy (Railway); trust its
  // X-Forwarded-For so rate limits apply per client, not per proxy.
  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    app.set('trust proxy', 1);
  }

  const assetDir = config.get('LOCAL_ASSET_DIR', { infer: true });
  if (assetDir) {
    app.useStaticAssets(resolve(assetDir), {
      prefix: '/images/',
      maxAge: '1h',
    });
  }
  return app;
}
