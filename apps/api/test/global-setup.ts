import { execSync } from 'node:child_process';

import { testDatabaseUrl } from './test-database.js';

/**
 * Brings the test database up to date before e2e runs. Non-destructive on
 * purpose: `migrate deploy` only applies pending migrations and the seed is
 * an idempotent upsert, so no data is wiped.
 */
export default function setup() {
  const url = testDatabaseUrl();
  if (!/_test(\?|$)/.test(url)) {
    throw new Error(`e2e tests must run against a *_test database: ${url}`);
  }
  const env = { ...process.env, DATABASE_URL: url };
  execSync('pnpm exec prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('pnpm exec tsx prisma/seed.ts', { env, stdio: 'inherit' });
}
