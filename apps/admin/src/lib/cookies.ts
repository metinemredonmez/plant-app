/**
 * The panel's session: the API's access and refresh tokens in two cookies
 * that page scripts cannot read (HttpOnly), that never leave over plain
 * HTTP in production (Secure) and never go with a request from another
 * site (SameSite=Strict). Plain functions, so they are unit tested.
 */
export const ACCESS_COOKIE = 'eb_admin_access';
export const REFRESH_COOKIE = 'eb_admin_refresh';

/** A working day: the panel asks for the password again after that. */
export const SESSION_SECONDS = 12 * 60 * 60;

export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: '/';
  maxAge: number;
}

export function cookieOptions(
  maxAge: number,
  env: string | undefined = process.env.NODE_ENV,
): CookieOptions {
  return {
    httpOnly: true,
    // http://localhost in development; production only over HTTPS.
    secure: env === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  };
}

/** Seconds since epoch from the token's `exp`, or 0 when unreadable. */
export function tokenExpiry(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return 0;
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof json.exp === 'number' ? json.exp : 0;
  } catch {
    return 0;
  }
}

/** Refresh a minute early, so a page never starts with a dying token. */
export function needsRefresh(token: string | undefined, now = Date.now()) {
  if (!token) return true;
  return tokenExpiry(token) * 1000 - now < 60_000;
}

/** Only paths inside the panel; nothing like //evil.example. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
