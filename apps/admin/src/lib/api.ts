import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { API_URL, ApiError, errorOf } from './api-public';
import { ACCESS_COOKIE } from './cookies';

export { ApiError };

/**
 * The admin API with the signed-in person's access token. The API checks
 * the role on every route; a missing or expired session goes to sign-in.
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/giris');
  const response = await fetch(`${API_URL}/v1/admin${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  if (response.status === 401) redirect('/giris');
  if (!response.ok) throw await errorOf(response);
  return (await response.json()) as T;
}

/** For pages: the API's answer, or its error message for a 403 or 404. */
export async function load<T>(path: string): Promise<{ data: T } | { error: string; status: number }> {
  try {
    return { data: await api<T>(path) };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, status: error.status };
    throw error;
  }
}
