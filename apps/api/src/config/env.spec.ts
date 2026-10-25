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
      }),
    ).not.toThrow();
  });
});
