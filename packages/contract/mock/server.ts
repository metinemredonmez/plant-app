import {networkInterfaces} from 'node:os';

import {API_ENDPOINTS, createMockServer, DEMO_OTP, DEMO_PASSWORD, type UpstreamOptions} from './app.js';

const port = Number(process.env.MOCK_PORT ?? 4010);
const delayMs = Number(process.env.MOCK_DELAY_MS ?? 0);

// MOCK_UPSTREAM=http://localhost:4100 forwards the endpoints the API already
// serves (or the comma-separated MOCK_UPSTREAM_ENDPOINTS) and mocks the rest.
const upstream: UpstreamOptions | undefined = process.env.MOCK_UPSTREAM
  ? {
      baseUrl: process.env.MOCK_UPSTREAM,
      endpoints: new Set(
        process.env.MOCK_UPSTREAM_ENDPOINTS?.split(',')
          .map(name => name.trim())
          .filter(Boolean) ?? API_ENDPOINTS,
      ),
    }
  : undefined;

const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find(net => net && net.family === 'IPv4' && !net.internal)?.address;

createMockServer({delayMs, log: true, upstream}).listen(port, '0.0.0.0', () => {
  console.log(`EverBloom mock API: http://localhost:${port}/api/plants`);
  if (lanAddress) console.log(`Gerçek cihaz için:  http://${lanAddress}:${port}/`);
  console.log(`Demo giriş: demo@everbloom.test / ${DEMO_PASSWORD}, OTP: ${DEMO_OTP}`);
  if (upstream) console.log(`API'ye yönlendirilen uçlar (${upstream.baseUrl}): ${[...upstream.endpoints].join(', ')}`);
  if (delayMs) console.log(`Yapay gecikme: ${delayMs} ms`);
});
