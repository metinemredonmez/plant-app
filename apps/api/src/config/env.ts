import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4100),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Base URL that image object keys are appended to: the local static route
  // in development, the R2/CDN address in production.
  ASSET_BASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  // When set, images in this folder are served at /images (development).
  LOCAL_ASSET_DIR: z.string().min(1).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  // Sessions: a short-lived JWT access token and a rotating refresh token.
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Requests per minute and IP on login, sign-up and refresh.
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule: the app refuses to start with a broken .env. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
