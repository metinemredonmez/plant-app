'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { api, ApiError } from '@/lib/api';
import { API_URL, publicApi, type TokenPair } from '@/lib/api-public';
import { ACCESS_COOKIE, cookieOptions, REFRESH_COOKIE, safeNext, SESSION_SECONDS } from '@/lib/cookies';
import type { Species } from '@/lib/types';

export interface FormState {
  error?: string;
  ok?: string;
  /** What was sent, so a refused form comes back filled in (React resets it). */
  values?: Record<string, string | string[]>;
}

const valuesOf = (form: FormData) => {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith('$')) continue;
    const all = form.getAll(key).map(String);
    values[key] = key === 'spots' ? all : (all[0] ?? '');
  }
  return values;
};

const message = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  throw error;
};

/** E-mail and password, then the admin role check; only then the cookies. */
export async function signIn(_state: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'E-posta ve parola gerekli', values: { email } };
  let pair: TokenPair;
  try {
    pair = await publicApi<TokenPair>('/user/login', { email, password });
  } catch (error) {
    return {
      error: error instanceof ApiError && error.status < 500 ? 'E-posta ya da parola hatalı' : message(error),
      values: { email },
    };
  }
  const me = await fetch(`${API_URL}/v1/admin/me`, {
    headers: { Authorization: `Bearer ${pair.token}` },
    cache: 'no-store',
  });
  if (!me.ok) {
    // A customer account: no panel session, and its tokens are dropped.
    await publicApi('/auth/logout', { refreshToken: pair.refreshToken }).catch(() => undefined);
    return { error: 'Bu hesabın panele girme yetkisi yok', values: { email } };
  }
  const store = await cookies();
  store.set(ACCESS_COOKIE, pair.token, cookieOptions(SESSION_SECONDS));
  store.set(REFRESH_COOKIE, pair.refreshToken, cookieOptions(SESSION_SECONDS));
  redirect(safeNext(String(form.get('next') ?? '')));
}

export async function signOut() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (refreshToken) await publicApi('/auth/logout', { refreshToken }).catch(() => undefined);
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  redirect('/giris');
}

const lines = (form: FormData, name: string) =>
  String(form.get(name) ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const optional = (form: FormData, name: string) => {
  const value = String(form.get(name) ?? '').trim();
  return value || null;
};

function speciesBody(form: FormData) {
  const toxic = String(form.get('toxicToPets') ?? 'unknown');
  return {
    scientificName: String(form.get('scientificName') ?? '').trim(),
    turkishName: String(form.get('turkishName') ?? '').trim(),
    otherNames: lines(form, 'otherNames'),
    synonyms: lines(form, 'synonyms'),
    family: optional(form, 'family'),
    light: form.get('light'),
    difficulty: form.get('difficulty'),
    waterSummerDays: Number(form.get('waterSummerDays')),
    waterWinterDays: Number(form.get('waterWinterDays')),
    humidity: form.get('humidity'),
    tempMinC: Number(form.get('tempMinC')),
    tempMaxC: Number(form.get('tempMaxC')),
    toxicToPets: toxic === 'yes' ? true : toxic === 'no' ? false : null,
    toxicityNote: optional(form, 'toxicityNote'),
    summary: String(form.get('summary') ?? '').trim(),
    wateringTip: String(form.get('wateringTip') ?? '').trim(),
    lightTip: String(form.get('lightTip') ?? '').trim(),
    fertilizingTip: String(form.get('fertilizingTip') ?? '').trim(),
    commonProblems: lines(form, 'commonProblems'),
    spots: form.getAll('spots').map(String),
    source: String(form.get('source') ?? '').trim(),
  };
}

export async function createSpecies(_state: FormState, form: FormData): Promise<FormState> {
  let created: Species;
  try {
    created = await api<Species>('/species', { body: speciesBody(form) });
  } catch (error) {
    return { error: message(error), values: valuesOf(form) };
  }
  revalidatePath('/turler');
  redirect(`/turler/${created.id}?kaydedildi=1`);
}

export async function updateSpecies(id: number, _state: FormState, form: FormData): Promise<FormState> {
  try {
    await api(`/species/${id}`, { method: 'PATCH', body: speciesBody(form) });
  } catch (error) {
    return { error: message(error), values: valuesOf(form) };
  }
  revalidatePath('/turler');
  revalidatePath(`/turler/${id}`);
  return { ok: 'Kaydedildi' };
}

export async function approveSpecies(id: number, _state: FormState): Promise<FormState> {
  try {
    await api(`/species/${id}/approve`, { method: 'POST' });
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath('/turler');
  revalidatePath(`/turler/${id}`);
  return { ok: 'Onaylandı ve yayında' };
}

export async function unpublishSpecies(id: number, _state: FormState): Promise<FormState> {
  try {
    await api(`/species/${id}`, { method: 'PATCH', body: { status: 'DRAFT' } });
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath('/turler');
  revalidatePath(`/turler/${id}`);
  return { ok: 'Yayından kaldırıldı' };
}

export async function draftSpecies(_state: FormState, form: FormData): Promise<FormState> {
  let drafted: Species;
  try {
    drafted = await api<Species>('/species/drafts', {
      body: { scientificName: String(form.get('scientificName') ?? '').trim() },
    });
  } catch (error) {
    return { error: message(error), values: valuesOf(form) };
  }
  revalidatePath('/turler');
  redirect(`/turler/${drafted.id}`);
}

export async function resolveReport(id: number, _state: FormState, form: FormData): Promise<FormState> {
  try {
    await api(`/reports/${id}/resolve`, { body: { resolution: String(form.get('resolution') ?? '').trim() } });
  } catch (error) {
    return { error: message(error), values: valuesOf(form) };
  }
  revalidatePath('/bildirimler');
  revalidatePath('/');
  return { ok: 'Kapatıldı' };
}

export async function anonymizeUser(id: number, _state: FormState): Promise<FormState> {
  try {
    await api(`/users/${id}/anonymize`, { method: 'POST' });
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath(`/kullanicilar/${id}`);
  return { ok: 'Hesap anonimleştirildi' };
}
