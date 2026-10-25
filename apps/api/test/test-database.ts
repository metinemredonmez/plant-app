import { config } from 'dotenv';

/**
 * The e2e database: TEST_DATABASE_URL if set, otherwise DATABASE_URL (shell
 * first, then .env) with the database name switched to `<name>_test`, e.g.
 * everbloom_dev → everbloom_test.
 */
export function testDatabaseUrl(): string {
  const env = {
    ...config({ path: '.env', processEnv: {}, quiet: true }).parsed,
    ...process.env,
  };
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  if (!env.DATABASE_URL) {
    throw new Error('Set DATABASE_URL in .env (or TEST_DATABASE_URL)');
  }
  const url = new URL(env.DATABASE_URL);
  url.pathname = url.pathname.replace(/(_dev)?$/, '_test');
  return url.toString();
}
