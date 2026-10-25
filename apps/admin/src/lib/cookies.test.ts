import { describe, expect, it } from 'vitest';

import { cookieOptions, needsRefresh, safeNext, SESSION_SECONDS, tokenExpiry } from './cookies';

const token = (exp: number) =>
  ['header', Buffer.from(JSON.stringify({ sub: '1', exp })).toString('base64url'), 'signature'].join('.');

describe('session cookies', () => {
  it('are HttpOnly, Secure and SameSite=Strict in production', () => {
    expect(cookieOptions(SESSION_SECONDS, 'production')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60,
    });
    // Plain http://localhost works in development; still HttpOnly and Strict.
    expect(cookieOptions(60, 'development')).toMatchObject({ httpOnly: true, secure: false, sameSite: 'strict' });
  });

  it('refreshes a token a minute before it expires', () => {
    const now = Date.parse('2026-10-26T10:00:00Z');
    const seconds = now / 1000;
    expect(tokenExpiry(token(seconds + 900))).toBe(seconds + 900);
    expect(needsRefresh(token(seconds + 900), now)).toBe(false);
    expect(needsRefresh(token(seconds + 30), now)).toBe(true);
    expect(needsRefresh(undefined, now)).toBe(true);
    expect(needsRefresh('not-a-token', now)).toBe(true);
  });

  it('only sends people back to paths inside the panel', () => {
    expect(safeNext('/turler/3')).toBe('/turler/3');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
