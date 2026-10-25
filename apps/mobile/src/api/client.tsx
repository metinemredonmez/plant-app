import axios, {InternalAxiosRequestConfig} from 'axios';

import {ENDPOINTS} from '../config';
import {logOut} from '../store/slices/userSlice';
import {setTokens} from '../store/slices/authSlice';
import type {TokenPairType} from '../types/SessionType';

// The store is attached at start-up (store/index) to avoid an import cycle.
type StoreLike = {
  getState: () => {authSlice: {token: string | null; refreshToken: string | null}};
  dispatch: (action: unknown) => unknown;
};

let store: StoreLike | null = null;

export const attachStore = (value: StoreLike) => {
  store = value;
};

export const accessToken = () => store?.getState().authSlice.token ?? null;

let refreshing: Promise<string | null> | null = null;

/**
 * Exchanges the refresh token for a new pair. Concurrent callers share one
 * request: the API treats a reused refresh token as theft and would end the
 * session. Only a definitive 401 logs out; a network error keeps the session.
 */
export function refreshSession(): Promise<string | null> {
  refreshing ??= (async () => {
    const refreshToken = store?.getState().authSlice.refreshToken;
    if (!store || !refreshToken) return null;
    try {
      const {data} = await axios.post<TokenPairType>(ENDPOINTS.AUTH_REFRESH, {
        refreshToken,
      });
      store.dispatch(setTokens(data));
      return data.token;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        store.dispatch(logOut());
      }
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Axios instance for the screens: adds the session and renews it on 401. */
export const api = axios.create({
  headers: {'Content-Type': 'application/json'},
});

api.interceptors.request.use(config => {
  const token = accessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, async error => {
  const request = error.config as
    | (InternalAxiosRequestConfig & {_retried?: boolean})
    | undefined;
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    request &&
    !request._retried &&
    store?.getState().authSlice.refreshToken
  ) {
    request._retried = true;
    const token = await refreshSession();
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
      return api(request);
    }
  }
  throw error;
});

/** Ends the session on the server; failures are ignored (best effort). */
export function revokeSession(refreshToken: string | null) {
  if (!refreshToken) return;
  axios.post(ENDPOINTS.AUTH_LOGOUT, {refreshToken}).catch(() => undefined);
}
