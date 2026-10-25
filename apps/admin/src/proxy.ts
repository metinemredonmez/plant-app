import { type NextRequest, NextResponse } from 'next/server';

import { refreshTokens } from './lib/api-public';
import { ACCESS_COOKIE, cookieOptions, needsRefresh, REFRESH_COOKIE, SESSION_SECONDS } from './lib/cookies';

/**
 * Optimistic check before every page: no session goes to sign-in; an access
 * token about to expire is refreshed here, the only place besides actions
 * that may set cookies, and handed to the page in the request. The API
 * still checks the role on every call.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signIn = pathname === '/giris';
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!needsRefresh(access)) {
    return signIn ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }
  if (refresh) {
    try {
      const pair = await refreshTokens(refresh);
      const cookie = request.cookies
        .getAll()
        .filter((c) => c.name !== ACCESS_COOKIE && c.name !== REFRESH_COOKIE)
        .map((c) => `${c.name}=${c.value}`)
        .concat(`${ACCESS_COOKIE}=${pair.token}`, `${REFRESH_COOKIE}=${pair.refreshToken}`)
        .join('; ');
      const headers = new Headers(request.headers);
      headers.set('cookie', cookie);
      const response = signIn
        ? NextResponse.redirect(new URL('/', request.url))
        : NextResponse.next({ request: { headers } });
      response.cookies.set(ACCESS_COOKIE, pair.token, cookieOptions(SESSION_SECONDS));
      response.cookies.set(REFRESH_COOKIE, pair.refreshToken, cookieOptions(SESSION_SECONDS));
      return response;
    } catch {
      // Refresh token used up or revoked: sign in again.
    }
  }
  if (signIn) return NextResponse.next();
  const login = new URL('/giris', request.url);
  if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
  const response = NextResponse.redirect(login);
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

export const config = {
  // Pages only: not static files or the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
