import {readFile} from 'node:fs/promises';
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import {extname} from 'node:path';

import type {z} from 'zod';

import {legacyEndpoints, type HttpMethod} from '../src/endpoints.js';
import {IMAGE_PREFIX, loadFixtures, type Fixtures} from '../src/fixtures/index.js';
import {requestSchemas, type LegacyOrder, type LegacyReview, type LegacyUser} from '../src/schemas.js';

/** Test credentials for the seeded user demo@everbloom.test */
export const DEMO_PASSWORD = 'demo1234';
/** Every OTP verifies with this code in the mock */
export const DEMO_OTP = '12345';

interface State extends Fixtures {
  passwords: Map<string, string>;
  nextId: {user: number; order: number; review: number};
}

interface Reply {
  status: number;
  body: unknown;
}

type Handler = (params: Record<string, string>, body: unknown, state: State) => Reply;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ok = (body: unknown): Reply => ({status: 200, body});
const fail = (status: number, message: string): Reply => ({status, body: {message}});

const displayDate = (date = new Date()) =>
  new Intl.DateTimeFormat('tr-TR', {timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric'}).format(date);

const mockTokens = (userId: number) => ({token: `mock-access-${userId}`, refreshToken: `mock-refresh-${userId}`});

const findUserByEmail = (state: State, email: string) =>
  state.users.find(user => user.email.toLowerCase() === email.trim().toLowerCase());

type RequestSchemas = typeof requestSchemas;

/** Validates a request body; invalid bodies become a 422 {message}. */
function parse<K extends keyof RequestSchemas>(name: K, body: unknown): z.output<RequestSchemas[K]> {
  const result = requestSchemas[name].safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(422, issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Geçersiz istek');
  }
  return result.data as z.output<RequestSchemas[K]>;
}

function createState(): State {
  const fixtures = loadFixtures();
  const passwords = new Map(fixtures.users.map(user => [user.email, DEMO_PASSWORD]));
  const maxId = (ids: number[]) => Math.max(0, ...ids) + 1;
  return {
    ...fixtures,
    passwords,
    nextId: {
      user: maxId(fixtures.users.map(user => user.id)),
      order: maxId(Object.values(fixtures.orders).flat().map(order => order.id)),
      review: maxId(Object.values(fixtures.reviews).flat().map(review => review.id)),
    },
  };
}

const handlers: Record<string, Handler> = {
  GET_USER: ({id}, _body, state) => {
    const user = state.users.find(u => u.id === Number(id));
    return user ? ok(user) : fail(404, 'Kullanıcı bulunamadı');
  },
  GET_ORDERS: ({userId}, _body, state) => ok({orders: state.orders[userId] ?? []}),
  GET_REVIEWS: ({plantId}, _body, state) => ok({reviews: state.reviews[plantId] ?? []}),
  GET_CAROUSEL: (_p, _b, state) => ok(state.slides),
  GET_PROMOCODES: (_p, _b, state) => ok(state.promocodes),
  GET_COLORS: (_p, _b, state) => ok(state.colors),
  GET_PLANTS: (_p, _b, state) => ok(state.plants),
  GET_POT_TYPES: (_p, _b, state) => ok(state.potTypes),
  GET_PLANT_TYPES: (_p, _b, state) => ok(state.plantTypes),
  GET_BANNERS: (_p, _b, state) => ok(state.banners),
  GET_CATEGORIES: (_p, _b, state) => ok(state.categories),

  LOGIN_USER: (_p, body, state) => {
    const data = parse('LOGIN_USER', body);
    const user = findUserByEmail(state, data.email);
    if (!user || state.passwords.get(user.email) !== data.password) {
      return fail(401, 'E-posta veya parola hatalı');
    }
    return ok({user, ...mockTokens(user.id)});
  },

  CREATE_USER: (_p, body, state) => {
    const data = parse('CREATE_USER', body);
    const taken = state.users.some(
      u => u.email.toLowerCase() === data.email.toLowerCase() || u.name.toLowerCase() === data.name.toLowerCase(),
    );
    if (taken) return fail(409, 'Bu ad veya e-posta ile kayıtlı bir kullanıcı var');
    const user: LegacyUser = {
      id: state.nextId.user++,
      name: data.name,
      email: data.email,
      location: null,
      phoneNumber: null,
      phoneVerified: false,
      emailVerified: false,
    };
    state.users.push(user);
    state.passwords.set(user.email, data.password);
    return ok({user, ...mockTokens(user.id)});
  },

  // Mock sessions are not signed: the refresh token just names the user.
  AUTH_REFRESH: (_p, body, state) => {
    const data = parse('AUTH_REFRESH', body);
    const id = Number(/^mock-refresh-(\d+)$/.exec(data.refreshToken)?.[1]);
    if (!state.users.some(u => u.id === id)) return fail(401, 'Oturum süresi doldu');
    return ok(mockTokens(id));
  },

  AUTH_LOGOUT: (_p, body) => {
    parse('AUTH_LOGOUT', body);
    return ok({message: 'Çıkış yapıldı'});
  },

  // Totals sent by the app are ignored and recomputed from catalog prices,
  // which is the rule the real API must follow too.
  ORDER_CREATE: (_p, body, state) => {
    const data = parse('ORDER_CREATE', body);
    if (!state.users.some(u => u.id === data.userId)) return fail(422, 'Kullanıcı bulunamadı');

    const products: LegacyOrder['products'] = [];
    for (const line of data.products) {
      const plant = state.plants.find(p => p.id === line.id);
      if (!plant) return fail(422, `Bitki bulunamadı: ${line.id}`);
      products.push({id: plant.id, name: plant.name, price: plant.price, quantity: line.quantity, color: line.color});
    }
    // The legacy body carries the discount percent but not the code, so the
    // mock only honours percents that belong to an existing promocode.
    const discount = state.promocodes.some(p => p.discount === data.discount) ? data.discount : 0;
    const subtotal = products.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const order: LegacyOrder = {
      id: state.nextId.order++,
      total: Math.round(subtotal * (1 - discount / 100)),
      delivery: 0,
      orderStatus: 'pending',
      createdAt: displayDate(),
      products,
    };
    (state.orders[String(data.userId)] ??= []).unshift(order);
    return ok({order});
  },

  DELETE_ACCOUNT: ({id}, _body, state) => {
    const index = state.users.findIndex(u => u.id === Number(id));
    if (index === -1) return fail(404, 'Kullanıcı bulunamadı');
    const [user] = state.users.splice(index, 1);
    state.passwords.delete(user.email);
    delete state.orders[id];
    return ok({message: 'Hesap silindi'});
  },

  CREATE_REVIEW: (_p, body, state) => {
    const data = parse('CREATE_REVIEW', body);
    const plant = state.plants.find(p => p.id === data.plantId);
    if (!plant) return fail(422, 'Bitki bulunamadı');
    const review: LegacyReview = {
      id: state.nextId.review++,
      name: data.name ?? 'Misafir',
      rating: data.rating,
      comment: data.comment,
      createdAt: displayDate(),
    };
    const reviews = (state.reviews[String(plant.id)] ??= []);
    reviews.unshift(review);
    plant.rating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
    return ok({review});
  },

  GET_PROMOCODE: (_p, body, state) => {
    const data = parse('GET_PROMOCODE', body);
    const promocode = state.promocodes.find(p => p.code.toLowerCase() === data.voucher.trim().toLowerCase());
    return promocode ? ok({promocode}) : fail(404, 'Promosyon kodu bulunamadı');
  },

  // Like the API: no reset token from verify/otp/email → 401.
  CHANGE_PASSWORD: (_p, body, state) => {
    if (!(body as {resetToken?: unknown})?.resetToken) return fail(401, 'Önce e-postanıza gelen kodu doğrulayın');
    const data = parse('CHANGE_PASSWORD', body);
    const user = findUserByEmail(state, data.email);
    if (!user || data.resetToken !== `mock-reset-${user.id}`) return fail(401, 'Şifre sıfırlama süresi doldu');
    state.passwords.set(user.email, data.password);
    return ok({message: 'Parola güncellendi'});
  },

  UPDATE_USER: ({id}, body, state) => {
    const data = parse('UPDATE_USER', body);
    const user = state.users.find(u => u.id === Number(id));
    if (!user) return fail(404, 'Kullanıcı bulunamadı');
    Object.assign(user, {name: data.name, location: data.location});
    return ok({user});
  },

  SEND_EMAIL_OTP: (_p, body) => {
    parse('SEND_EMAIL_OTP', body);
    return ok({message: `Kod gönderildi (mock: ${DEMO_OTP})`});
  },

  SEND_PHONE_OTP: (_p, body) => {
    parse('SEND_PHONE_OTP', body);
    return ok({message: `Kod gönderildi (mock: ${DEMO_OTP})`});
  },

  VERIFY_PHONE_OTP: (_p, body, state) => {
    const data = parse('VERIFY_PHONE_OTP', body);
    const user = data.email ? findUserByEmail(state, data.email) : undefined;
    if (!user) return fail(404, 'Kullanıcı bulunamadı');
    if (data.otp !== DEMO_OTP) return fail(401, 'Kod hatalı');
    Object.assign(user, {phoneNumber: data.phoneNumber, phoneVerified: true});
    return ok({user});
  },

  VERIFY_EMAIL_OTP: (_p, body, state) => {
    const data = parse('VERIFY_EMAIL_OTP', body);
    const user = findUserByEmail(state, data.email);
    if (!user) return fail(404, 'Kullanıcı bulunamadı');
    if (data.otp !== DEMO_OTP) return fail(401, 'Kod hatalı');
    user.emailVerified = true;
    // resetToken is the field the real API will require on change/password.
    return ok({user, resetToken: `mock-reset-${user.id}`});
  },
};

interface Route {
  name: string;
  method: HttpMethod;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = legacyEndpoints.map(endpoint => {
  const keys: string[] = [];
  const source = endpoint.path.replace(/:(\w+)/g, (_match, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  const handler = handlers[endpoint.name];
  if (!handler) throw new Error(`Mock handler missing for ${endpoint.name}`);
  return {name: endpoint.name, method: endpoint.method, pattern: new RegExp(`^${source}/?$`), keys, handler};
});

/** Rewrites "/images/x.jpg" to an absolute URL the device can load. */
function absolutize(value: unknown, baseUrl: string): unknown {
  if (typeof value === 'string') return value.startsWith(IMAGE_PREFIX) ? baseUrl + value : value;
  if (Array.isArray(value)) return value.map(item => absolutize(item, baseUrl));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, absolutize(item, baseUrl)]));
  }
  return value;
}

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const raw = (await readRawBody(req)).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Legacy endpoints the NestJS API still serves: catalog, sessions, users,
 * OTP and password reset. Orders, reviews and promocodes left the API with
 * the plant store (tag v0-ticaret); the mock keeps answering them so the old
 * Expo app still runs until the new app replaces it.
 */
export const API_ENDPOINTS = [
  'GET_PLANTS',
  'GET_CATEGORIES',
  'GET_COLORS',
  'GET_POT_TYPES',
  'GET_PLANT_TYPES',
  'GET_CAROUSEL',
  'GET_BANNERS',
  'LOGIN_USER',
  'CREATE_USER',
  'GET_USER',
  'UPDATE_USER',
  'DELETE_ACCOUNT',
  'AUTH_REFRESH',
  'AUTH_LOGOUT',
  // week 4
  'SEND_EMAIL_OTP',
  'VERIFY_EMAIL_OTP',
  'SEND_PHONE_OTP',
  'VERIFY_PHONE_OTP',
  'CHANGE_PASSWORD',
];

export interface UpstreamOptions {
  /** Base URL of the real API, e.g. http://localhost:4100 */
  baseUrl: string;
  /** Endpoint names (see endpoints.ts) that are forwarded to it */
  endpoints: ReadonlySet<string>;
}

/** Passes a request through to the real API and relays its answer as is. */
async function forward(req: IncomingMessage, res: ServerResponse, url: URL, upstream: UpstreamOptions): Promise<number> {
  const method = req.method ?? 'GET';
  const headers: Record<string, string> = {};
  for (const name of ['authorization', 'content-type']) {
    const value = req.headers[name];
    if (typeof value === 'string') headers[name] = value;
  }
  try {
    const response = await fetch(new URL(url.pathname + url.search, upstream.baseUrl), {
      method,
      headers,
      body: method === 'GET' || method === 'DELETE' ? undefined : new Uint8Array(await readRawBody(req)),
    });
    res.writeHead(response.status, {'Content-Type': response.headers.get('content-type') ?? 'application/json'});
    res.end(Buffer.from(await response.arrayBuffer()));
    return response.status;
  } catch {
    return sendJson(res, 502, {message: `API'ye ulaşılamadı: ${upstream.baseUrl}`});
  }
}

const IMAGE_DIR = new URL('./public/images/', import.meta.url);
const MIME: Record<string, string> = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'};

async function serveImage(file: string, res: ServerResponse): Promise<number> {
  const type = MIME[extname(file).toLowerCase()];
  if (!type || file.includes('..') || file.includes('/')) return sendJson(res, 404, {message: 'Görsel bulunamadı'});
  try {
    const data = await readFile(new URL(file, IMAGE_DIR));
    res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'public, max-age=3600'});
    res.end(data);
    return 200;
  } catch {
    return sendJson(res, 404, {message: 'Görsel bulunamadı'});
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): number {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(body));
  return status;
}

export interface MockServerOptions {
  /** Artificial latency per request, to see loading states */
  delayMs?: number;
  log?: boolean;
  /**
   * Forward some endpoints to the real API and mock the rest, so the app
   * can switch to the backend one endpoint at a time.
   */
  upstream?: UpstreamOptions;
}

export function createMockServer({delayMs = 0, log = false, upstream}: MockServerOptions = {}): Server {
  for (const name of upstream?.endpoints ?? []) {
    if (!legacyEndpoints.some(endpoint => endpoint.name === name)) throw new Error(`Unknown endpoint: ${name}`);
  }
  const state = createState();

  return createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const method = (req.method ?? 'GET').toUpperCase();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    let status: number;
    let source = 'mock';
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));

    if (method === 'OPTIONS') {
      res.writeHead(204).end();
      status = 204;
    } else if (method === 'GET' && url.pathname === '/health') {
      status = sendJson(res, 200, {status: 'ok', mode: 'mock'});
    } else if (method === 'GET' && url.pathname.startsWith(IMAGE_PREFIX)) {
      status = await serveImage(decodeURIComponent(url.pathname.slice(IMAGE_PREFIX.length)), res);
    } else {
      const route = routes.find(r => r.method === method && r.pattern.test(url.pathname));
      if (!route) {
        status = sendJson(res, 404, {message: `Tanımsız uç: ${method} ${url.pathname}`});
      } else if (upstream?.endpoints.has(route.name)) {
        source = 'api';
        status = await forward(req, res, url, upstream);
      } else {
        const match = route.pattern.exec(url.pathname)!;
        const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
        const body = method === 'GET' || method === 'DELETE' ? {} : await readBody(req);
        let reply: Reply;
        try {
          reply = body === undefined ? fail(400, 'Gövde geçerli JSON değil') : route.handler(params, body, state);
        } catch (error) {
          if (!(error instanceof HttpError)) throw error;
          reply = fail(error.status, error.message);
        }
        status = sendJson(res, reply.status, absolutize(reply.body, `http://${req.headers.host ?? 'localhost'}`));
      }
    }

    if (log) {
      const auth = req.headers.authorization ? 'auth' : 'no-auth';
      console.log(`${method} ${url.pathname} → ${status} (${source}, ${Date.now() - started} ms, ${auth})`);
    }
  });
}
