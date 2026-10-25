/** The EverBloom API, reached from this server only; the browser never calls it. */
export const API_URL = (process.env.ADMIN_API_URL ?? 'http://localhost:4100/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface TokenPair {
  token: string;
  refreshToken: string;
}

export async function errorOf(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
  return new ApiError(response.status, typeof message === 'string' ? message : `HTTP ${response.status}`);
}

/** Without a session; for sign-in, refresh and sign-out. Also used by the proxy. */
export async function publicApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) throw await errorOf(response);
  return (await response.json()) as T;
}

export function refreshTokens(refreshToken: string) {
  return publicApi<TokenPair>('/auth/refresh', { refreshToken });
}
