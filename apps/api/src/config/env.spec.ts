import { validateEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://u@localhost:5432/db',
  ASSET_BASE_URL: 'https://cdn.test/images/',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('defaults to the log drivers in development', () => {
    expect(validateEnv(base)).toMatchObject({
      SMS_DRIVER: 'log',
      EMAIL_DRIVER: 'log',
      ASSET_BASE_URL: 'https://cdn.test/images',
    });
  });

  it('refuses to start production with the log drivers', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /log driver is not allowed in production/,
    );
  });

  it('requires Netgsm credentials for SMS_DRIVER=netgsm', () => {
    expect(() => validateEnv({ ...base, SMS_DRIVER: 'netgsm' })).toThrow(
      /NETGSM_USERCODE/,
    );
  });

  it('accepts a complete production setup', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        SMS_DRIVER: 'netgsm',
        NETGSM_USERCODE: '8501112233',
        NETGSM_PASSWORD: 'sifre',
        NETGSM_MSGHEADER: 'EVERBLOOM',
        EMAIL_DRIVER: 'smtp',
        SMTP_URL: 'smtps://u:p@smtp.example.com:465',
        VISION_DRIVER: 'kindwise',
        KINDWISE_API_KEY: 'kw-key',
        ASSISTANT_DRIVER: 'anthropic',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        STORAGE_DRIVER: 'r2',
        R2_ACCOUNT_ID: 'hesap',
        R2_ACCESS_KEY_ID: 'anahtar',
        R2_SECRET_ACCESS_KEY: 'gizli',
        R2_BUCKET: 'everbloom-scans',
        REVENUECAT_WEBHOOK_SECRET: 'x'.repeat(24),
      }),
    ).not.toThrow();
  });

  it('requires R2 credentials and refuses local photos in production', () => {
    expect(() => validateEnv({ ...base, STORAGE_DRIVER: 'r2' })).toThrow(
      /R2_ACCOUNT_ID[\s\S]*R2_BUCKET/,
    );
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /local storage is not allowed in production/,
    );
  });

  it('refuses fake AI drivers in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        SMS_DRIVER: 'netgsm',
        NETGSM_USERCODE: '8501112233',
        NETGSM_PASSWORD: 'sifre',
        NETGSM_MSGHEADER: 'EVERBLOOM',
        EMAIL_DRIVER: 'smtp',
        SMTP_URL: 'smtps://u:p@smtp.example.com:465',
      }),
    ).toThrow(
      /VISION_DRIVER[\s\S]*ASSISTANT_DRIVER[\s\S]*REVENUECAT_WEBHOOK_SECRET/,
    );
  });
});
