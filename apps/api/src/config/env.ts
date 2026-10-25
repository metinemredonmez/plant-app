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

  // AI plant care. `fake` drivers answer from fixtures without calling
  // anyone (development and tests); production needs the real ones.
  VISION_DRIVER: z.enum(['fake', 'kindwise']).default('fake'),
  KINDWISE_API_KEY: z.string().min(1).optional(),
  ASSISTANT_DRIVER: z.enum(['fake', 'anthropic']).default('fake'),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ASSISTANT_MODEL: z.string().min(1).default('claude-opus-5-5'),
  // Scan photos (personal data): a local folder in development, a private
  // Cloudflare R2 bucket in production.
  STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  // Free plan (docs/kapsam.md): identification per rolling week, one trial
  // diagnosis, assistant messages per Istanbul calendar month, plants.
  FREE_IDENTIFY_PER_WEEK: z.coerce.number().int().nonnegative().default(3),
  FREE_DIAGNOSES: z.coerce.number().int().nonnegative().default(1),
  FREE_MESSAGES_PER_MONTH: z.coerce.number().int().nonnegative().default(10),
  FREE_PLANTS: z.coerce.number().int().positive().default(5),
  // Premium is fair use: scans per Istanbul day, messages per month.
  PREMIUM_SCANS_PER_DAY: z.coerce.number().int().positive().default(50),
  PREMIUM_MESSAGES_PER_MONTH: z.coerce.number().int().positive().default(300),
  // RevenueCat sends `Authorization: Bearer <secret>` on every webhook.
  REVENUECAT_WEBHOOK_SECRET: z.string().min(16).optional(),
  // Current version of the AI processing consent text (KVKK, Apple 5.1.2(i)).
  AI_CONSENT_VERSION: z.string().min(1).default('2026-10-25'),

  // Sign-in methods besides e-mail (docs/adr/0012). Each is off until its
  // settings exist; the app shows only what GET /v1/app-config lists.
  AUTH_APPLE_ENABLED: z.stringbool().default(false),
  // The app's bundle id: the `aud` of Apple identity tokens.
  APPLE_BUNDLE_ID: z.string().min(1).default('com.everbloom.care'),
  // "Sign in with Apple" key, for the token exchange and the revocation at
  // account deletion. The .p8 content may be one line with \n escapes.
  APPLE_TEAM_ID: z.string().min(1).optional(),
  APPLE_KEY_ID: z.string().min(1).optional(),
  APPLE_PRIVATE_KEY: z.string().min(1).optional(),
  AUTH_GOOGLE_ENABLED: z.stringbool().default(false),
  // OAuth client ids (public values). Tokens from the app carry the web id
  // on Android and the iOS id on iOS.
  GOOGLE_WEB_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
  AUTH_PHONE_ENABLED: z.stringbool().default(false),
  // HMAC key for phone numbers: only the hash and the last two digits are
  // stored.
  PHONE_PEPPER: z.string().min(32).optional(),
  PHONE_CODES_PER_NUMBER_PER_DAY: z.coerce.number().int().positive().default(5),
  PHONE_CODES_PER_DAY: z.coerce.number().int().positive().default(1000),
  // Android SMS Retriever: the app's 11-character hash, last line of the SMS.
  SMS_RETRIEVER_HASH: z
    .string()
    .regex(/^[A-Za-z0-9+/]{11}$/)
    .optional(),
  // AES-256-GCM key (32 bytes, base64) for the stored Apple refresh tokens.
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine(
      (key) => Buffer.from(key, 'base64').length === 32,
      'must be 32 bytes in base64',
    )
    .optional(),
  // Testing and overrides; the defaults are the providers' real addresses.
  APPLE_AUTH_URL: z.url().default('https://appleid.apple.com'),
  GOOGLE_JWKS_URL: z
    .url()
    .default('https://www.googleapis.com/oauth2/v3/certs'),
  // Older app versions are sent to the update screen.
  MIN_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .default('1.0.0'),
  // Show the one-time paywall after the first sign-up.
  PAYWALL_ONBOARDING: z.stringbool().default(true),
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
  if (env.VISION_DRIVER === 'kindwise') {
    require('KINDWISE_API_KEY', 'VISION_DRIVER=kindwise');
  }
  if (env.ASSISTANT_DRIVER === 'anthropic') {
    require('ANTHROPIC_API_KEY', 'ASSISTANT_DRIVER=anthropic');
  }
  if (env.STORAGE_DRIVER === 'r2') {
    for (const key of [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET',
    ] as const) {
      require(key, 'STORAGE_DRIVER=r2');
    }
  }
  if (env.AUTH_APPLE_ENABLED) {
    // Without the key, access could not be revoked at account deletion.
    for (const key of [
      'APPLE_TEAM_ID',
      'APPLE_KEY_ID',
      'APPLE_PRIVATE_KEY',
      'TOKEN_ENCRYPTION_KEY',
    ] as const) {
      require(key, 'AUTH_APPLE_ENABLED=true');
    }
  }
  if (env.AUTH_GOOGLE_ENABLED) {
    require('GOOGLE_WEB_CLIENT_ID', 'AUTH_GOOGLE_ENABLED=true');
    require('GOOGLE_IOS_CLIENT_ID', 'AUTH_GOOGLE_ENABLED=true');
  }
  if (env.AUTH_PHONE_ENABLED)
    require('PHONE_PEPPER', 'AUTH_PHONE_ENABLED=true');
  // A production server must never "send" codes to its own log, nor answer
  // scans and questions from fixtures.
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
    for (const key of ['VISION_DRIVER', 'ASSISTANT_DRIVER'] as const) {
      if (env[key] === 'fake') {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'fake driver is not allowed in production',
        });
      }
    }
    // App Store 4.8: an app with Google sign-in offers Sign in with Apple.
    if (env.AUTH_GOOGLE_ENABLED && !env.AUTH_APPLE_ENABLED) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_APPLE_ENABLED'],
        message: 'required when AUTH_GOOGLE_ENABLED=true (App Store 4.8)',
      });
    }
    // A server's disk is not durable (Railway redeploys wipe it).
    if (env.STORAGE_DRIVER === 'local') {
      ctx.addIssue({
        code: 'custom',
        path: ['STORAGE_DRIVER'],
        message: 'local storage is not allowed in production',
      });
    }
    require('REVENUECAT_WEBHOOK_SECRET', 'NODE_ENV=production');
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
