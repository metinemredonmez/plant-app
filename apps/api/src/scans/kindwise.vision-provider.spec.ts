import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { KindwiseVisionProvider } from './kindwise.vision-provider.js';
import { VisionProviderError } from './vision-provider.js';

let server: Server;
let baseUrl = '';
const seen: { method?: string; url?: string; key?: unknown }[] = [];
let deleteStatus = 200;

beforeAll(async () => {
  server = createServer((req, res) => {
    seen.push({
      method: req.method,
      url: req.url,
      key: req.headers['api-key'],
    });
    req.resume();
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'DELETE') {
        res.statusCode = deleteStatus;
        res.end('true');
        return;
      }
      res.end(
        JSON.stringify({
          access_token: 'tok/en 1',
          result: {
            is_plant: { binary: true },
            is_healthy: { binary: true, probability: 0.9 },
            classification: { suggestions: [] },
            disease: { suggestions: [] },
          },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

const provider = () =>
  new KindwiseVisionProvider({ apiKey: 'anahtar', baseUrl });
const image = { data: Buffer.from('x'), mimeType: 'image/jpeg' };

describe('Kindwise records', () => {
  it('hands back the token of each call', async () => {
    expect((await provider().identify(image)).providerRef).toBe('tok/en 1');
    expect((await provider().diagnose(image)).providerRef).toBe('tok/en 1');
  });

  it('deletes through the identification endpoint with the key', async () => {
    seen.length = 0;
    deleteStatus = 200;
    await provider().forget('tok/en 1');
    expect(seen).toEqual([
      {
        method: 'DELETE',
        url: '/api/v3/identification/tok%2Fen%201',
        key: 'anahtar',
      },
    ]);
  });

  it('takes "already gone" as done and reports other failures', async () => {
    deleteStatus = 404;
    await expect(provider().forget('x')).resolves.toBeUndefined();
    deleteStatus = 503;
    await expect(provider().forget('x')).rejects.toBeInstanceOf(
      VisionProviderError,
    );
  });
});
