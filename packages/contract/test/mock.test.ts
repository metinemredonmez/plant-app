import assert from 'node:assert/strict';
import {createServer, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {after, before, describe, test} from 'node:test';

import {createMockServer, DEMO_OTP, DEMO_PASSWORD} from '../mock/app.js';
import {legacyEndpoints, responseSchemas} from '../src/index.js';

const server = createMockServer();
let baseUrl = '';

before(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>(resolve => server.close(() => resolve())));

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {'Content-Type': 'application/json', Authorization: 'Bearer test'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {status: response.status, body: await response.json()};
}

const demo = {email: 'demo@everbloom.test', password: DEMO_PASSWORD};

// One happy-path call per legacy endpoint, in an order that keeps state valid
// (the account is deleted last). Bodies mirror what the screens send.
const cases: {name: keyof typeof responseSchemas; method: string; path: string; body?: unknown}[] = [
  {name: 'GET_PLANTS', method: 'GET', path: '/api/plants'},
  {name: 'GET_CATEGORIES', method: 'GET', path: '/api/categories'},
  {name: 'GET_COLORS', method: 'GET', path: '/api/colors'},
  {name: 'GET_POT_TYPES', method: 'GET', path: '/api/pot/types'},
  {name: 'GET_PLANT_TYPES', method: 'GET', path: '/api/plant/types'},
  {name: 'GET_BANNERS', method: 'GET', path: '/api/banners'},
  {name: 'GET_CAROUSEL', method: 'GET', path: '/api/slides'},
  {name: 'GET_PROMOCODES', method: 'GET', path: '/api/promocodes'},
  {name: 'LOGIN_USER', method: 'POST', path: '/api/user/login', body: demo},
  {name: 'GET_USER', method: 'GET', path: '/api/user/1'},
  {name: 'GET_ORDERS', method: 'GET', path: '/api/order/1'},
  {name: 'GET_REVIEWS', method: 'GET', path: '/api/reviews/1'},
  {name: 'CREATE_USER', method: 'POST', path: '/api/user/create', body: {name: 'Deniz Kaya', email: 'deniz@everbloom.test', password: 'secret12'}},
  {
    name: 'ORDER_CREATE',
    method: 'POST',
    path: '/api/order/create',
    body: {
      name: 'Ayse Yilmaz',
      total: 1,
      address: 'Moda Cd. 1, Kadıköy',
      discount: 10,
      delivery: 0,
      subtotal: 1,
      cardHolderName: 'AYSE YILMAZ',
      products: [{id: 1, name: 'Monstera Deliciosa 40-50 cm', price: 1, quantity: 2, color: 'Beyaz'}],
      userId: 1,
      email: demo.email,
      phoneNumber: '+905551112233',
    },
  },
  {name: 'CREATE_REVIEW', method: 'POST', path: '/api/review/create', body: {comment: 'Harika geldi', rating: 5, name: 'Ayse', plantId: 1, email: demo.email}},
  {name: 'GET_PROMOCODE', method: 'POST', path: '/api/promocode/show', body: {voucher: 'hosgeldin10'}},
  {name: 'UPDATE_USER', method: 'PUT', path: '/api/user/update/1', body: {name: 'Ayse Yilmaz', location: 'Moda, İstanbul'}},
  {name: 'SEND_EMAIL_OTP', method: 'POST', path: '/api/send/otp/email', body: {email: demo.email}},
  {name: 'VERIFY_EMAIL_OTP', method: 'POST', path: '/api/verify/otp/email', body: {email: demo.email, otp: DEMO_OTP}},
  {name: 'SEND_PHONE_OTP', method: 'POST', path: '/api/send/otp/phone', body: {email: demo.email, phoneNumber: '+905551112233'}},
  {name: 'VERIFY_PHONE_OTP', method: 'POST', path: '/api/verify/otp/phone', body: {email: demo.email, phoneNumber: '+905551112233', otp: DEMO_OTP}},
  {name: 'CHANGE_PASSWORD', method: 'POST', path: '/api/change/password', body: {email: 'deniz@everbloom.test', password: 'secret34'}},
  {name: 'AUTH_REFRESH', method: 'POST', path: '/api/auth/refresh', body: {refreshToken: 'mock-refresh-2'}},
  {name: 'AUTH_LOGOUT', method: 'POST', path: '/api/auth/logout', body: {refreshToken: 'mock-refresh-2'}},
  {name: 'DELETE_ACCOUNT', method: 'DELETE', path: '/api/user/delete/2'},
];

describe('every legacy endpoint answers 200 with the shape the app reads', () => {
  for (const c of cases) {
    test(`${c.method} ${c.path}`, async () => {
      const {status, body} = await call(c.method, c.path, c.body);
      assert.equal(status, 200, JSON.stringify(body));
      responseSchemas[c.name].parse(body);
    });
  }

  test('the cases above cover all 25 endpoints', () => {
    assert.equal(legacyEndpoints.length, 25);
    assert.deepEqual(new Set(cases.map(c => c.name)), new Set(legacyEndpoints.map(e => e.name)));
  });
});

describe('error statuses the app branches on', () => {
  test('wrong password → 401', async () => {
    assert.equal((await call('POST', '/api/user/login', {...demo, password: 'nope'})).status, 401);
  });

  test('duplicate sign-up → 409', async () => {
    const {status} = await call('POST', '/api/user/create', {name: 'Biri', email: demo.email, password: 'secret12'});
    assert.equal(status, 409);
  });

  test('unknown promocode → 404', async () => {
    assert.equal((await call('POST', '/api/promocode/show', {voucher: 'YOK'})).status, 404);
  });

  test('wrong OTP → 401 with a message', async () => {
    const {status, body} = await call('POST', '/api/verify/otp/email', {email: demo.email, otp: '00000'});
    assert.equal(status, 401);
    assert.equal(typeof body.message, 'string');
  });

  test('unknown user on GET /api/user/:id → 404 (the app logs out)', async () => {
    assert.equal((await call('GET', '/api/user/999')).status, 404);
  });

  test('invalid body → 422 {message}', async () => {
    const {status, body} = await call('POST', '/api/review/create', {comment: 'x', rating: 9, plantId: 1});
    assert.equal(status, 422);
    assert.match(body.message, /rating/);
  });
});

describe('contract rules', () => {
  test('client-sent totals are ignored on order create', async () => {
    const {body} = await call('POST', '/api/order/create', {...cases.find(c => c.name === 'ORDER_CREATE')!.body as object});
    // 2 × 749 TL with the 10% HOSGELDIN10 percent, not the "1" the client sent.
    assert.equal(body.order.total, 1348);
    assert.equal(body.order.products[0].price, 749);
  });

  test('new orders show up first in order history with the plant id as line id', async () => {
    const {body} = await call('GET', '/api/order/1');
    assert.equal(body.orders[0].orderStatus, 'pending');
    assert.equal(body.orders[0].products[0].id, 1);
  });

  test('image URLs are absolute and served', async () => {
    const {body} = await call('GET', '/api/plants');
    assert.ok(body[0].image.startsWith(`${baseUrl}/images/`));
    const image = await fetch(body[0].image);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
  });

  test('unknown routes answer 404 {message}', async () => {
    const {status, body} = await call('GET', '/api/nope');
    assert.equal(status, 404);
    assert.equal(typeof body.message, 'string');
  });
});

describe('upstream mode', () => {
  const api = createServer((req, res) => {
    res.writeHead(req.url === '/api/colors' ? 200 : 404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(req.url === '/api/colors' ? [{id: 99, name: 'API rengi', code: '#000000'}] : {message: 'yok'}));
  });
  let hybrid: Server;
  let hybridUrl = '';

  before(async () => {
    await new Promise<void>(resolve => api.listen(0, '127.0.0.1', resolve));
    const apiUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
    hybrid = createMockServer({upstream: {baseUrl: apiUrl, endpoints: new Set(['GET_COLORS'])}});
    await new Promise<void>(resolve => hybrid.listen(0, '127.0.0.1', resolve));
    hybridUrl = `http://127.0.0.1:${(hybrid.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>(resolve => hybrid.close(() => resolve()));
    await new Promise<void>(resolve => api.close(() => resolve()));
  });

  test('forwarded endpoints answer from the API', async () => {
    const response = await fetch(`${hybridUrl}/api/colors`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{id: 99, name: 'API rengi', code: '#000000'}]);
  });

  test('other endpoints stay mocked', async () => {
    const response = await fetch(`${hybridUrl}/api/categories`);
    responseSchemas.GET_CATEGORIES.parse(await response.json());
  });

  test('an unreachable API answers 502 {message}', async () => {
    const offline = createMockServer({upstream: {baseUrl: 'http://127.0.0.1:9', endpoints: new Set(['GET_PLANTS'])}});
    await new Promise<void>(resolve => offline.listen(0, '127.0.0.1', resolve));
    const response = await fetch(`http://127.0.0.1:${(offline.address() as AddressInfo).port}/api/plants`);
    await new Promise<void>(resolve => offline.close(() => resolve()));
    assert.equal(response.status, 502);
    assert.equal(typeof (await response.json()).message, 'string');
  });

  test('unknown endpoint names are rejected', () => {
    assert.throws(() => createMockServer({upstream: {baseUrl: 'http://x', endpoints: new Set(['NOPE'])}}));
  });
});

describe('mock sessions', () => {
  test('an unknown refresh token → 401', async () => {
    assert.equal((await call('POST', '/api/auth/refresh', {refreshToken: 'nope'})).status, 401);
  });

  test('a password shorter than 8 characters → 422', async () => {
    const {status} = await call('POST', '/api/user/create', {name: 'Kısa', email: 'kisa@everbloom.test', password: 'abc123'});
    assert.equal(status, 422);
  });
});
