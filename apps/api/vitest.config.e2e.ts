import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

import { testDatabaseUrl } from './test/test-database.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Runtime env wins over .env, so these override the developer's values.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: testDatabaseUrl(),
      ASSET_BASE_URL: 'http://assets.test/images',
      LOCAL_ASSET_DIR: '../../packages/contract/mock/public/images',
      JWT_SECRET: 'e2e-test-secret-that-is-at-least-32-characters',
      AUTH_RATE_LIMIT: '1000',
      VISION_DRIVER: 'fake',
      ASSISTANT_DRIVER: 'fake',
      UPLOAD_DIR: join(tmpdir(), 'everbloom-e2e-uploads'),
      FREE_IDENTIFY_PER_WEEK: '3',
      FREE_DIAGNOSES: '1',
      FREE_MESSAGES_PER_MONTH: '10',
      FREE_PLANTS: '5',
      REVENUECAT_WEBHOOK_SECRET: 'e2e-revenuecat-webhook-secret',
    },
    globalSetup: ['test/global-setup.ts'],
    // One shared database: run e2e files one after another.
    fileParallelism: false,
  },
});
