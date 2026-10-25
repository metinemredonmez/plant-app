import { z } from 'zod';

const fields = z.object({
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
  // Requests per minute and IP on login, sign-up, refresh and OTP routes.
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(10),

  // Verification codes. `log` writes messages to the log and an in-memory
  // outbox instead of sending them (development and tests only).
  SMS_DRIVER: z.enum(['log', 'netgsm']).default('log'),
  NETGSM_USERCODE: z.string().min(1).optional(),
  NETGSM_PASSWORD: z.string().min(1).optional(),
  // Approved sender ID (başlık), or the Netgsm subscriber number.
  NETGSM_MSGHEADER: z.string().min(1).optional(),
  EMAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
  // e.g. smtps://user:password@smtp.example.com:465
  SMTP_URL: z.url({ protocol: /^smtps?$/ }).optional(),
  EMAIL_FROM: z.string().min(3).default('EverBloom <no-reply@everbloom.test>'),
});

/** Rules that span several variables. */
export const envSchema = fields.superRefine((env, ctx) => {
  const require = (key: keyof typeof env, when: string) => {
    if (!env[key]) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: `required when ${when}`,
      });
    }
  };
  if (env.SMS_DRIVER === 'netgsm') {
    require('NETGSM_USERCODE', 'SMS_DRIVER=netgsm');
    require('NETGSM_PASSWORD', 'SMS_DRIVER=netgsm');
    require('NETGSM_MSGHEADER', 'SMS_DRIVER=netgsm');
  }
  if (env.EMAIL_DRIVER === 'smtp') require('SMTP_URL', 'EMAIL_DRIVER=smtp');
  // A production server must never "send" codes to its own log.
  if (env.NODE_ENV === 'production') {
    for (const key of ['SMS_DRIVER', 'EMAIL_DRIVER'] as const) {
      if (env[key] === 'log') {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'log driver is not allowed in production',
        });
      }
    }
  }
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
