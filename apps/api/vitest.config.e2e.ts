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
    },
    globalSetup: ['test/global-setup.ts'],
    // One shared database: run e2e files one after another.
    fileParallelism: false,
  },
});
