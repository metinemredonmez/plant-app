import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { OpenMeteoWeatherProvider } from './open-meteo.weather-provider.js';
import { weatherSummary } from './weather-provider.js';

let server: Server;
let base = '';
const requests: string[] = [];
let failForecast = false;

beforeAll(async () => {
  server = createServer((req, res) => {
    requests.push(req.url ?? '');
    const url = new URL(req.url ?? '/', 'http://x');
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/v1/search') {
      const hit = url.searchParams.get('name') === 'İzmir';
      res.end(
        JSON.stringify(
          hit
            ? {
                results: [
                  { latitude: 38.41, longitude: 27.14, country_code: 'TR' },
                ],
              }
            : {},
        ),
      );
    } else if (url.pathname === '/v1/forecast') {
      if (failForecast) {
        res.statusCode = 503;
        res.end('{}');
        return;
      }
      res.end(
        JSON.stringify({
          current: { temperature_2m: 15.6, relative_humidity_2m: 84 },
          daily: {
            time: ['2026-10-26', '2026-10-27', '2026-10-28'],
            temperature_2m_max: [21.7, 16.7, 18.1],
            temperature_2m_min: [14.0, 1.5, 13.4],
            precipitation_sum: [10.6, 0.2, 0],
          },
        }),
      );
    }
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

const provider = (apiKey?: string) =>
  new OpenMeteoWeatherProvider({
    apiKey,
    forecastUrl: base,
    geocodingUrl: base,
  });

describe('Open-Meteo weather', () => {
  it('finds the province centre, reads three days and caches them', async () => {
    requests.length = 0;
    const weather = provider();
    const first = await weather.forCity('İzmir');
    expect(first).toMatchObject({
      city: 'İzmir',
      now: { temperature: 15.6, humidity: 84 },
      days: [
        { date: '2026-10-26', min: 14, max: 21.7, precipitation: 10.6 },
        { date: '2026-10-27', min: 1.5, max: 16.7 },
        { date: '2026-10-28', min: 13.4, max: 18.1 },
      ],
    });
    expect(requests[0]).toContain('countryCode=TR');
    expect(requests[1]).toContain('timezone=Europe%2FIstanbul');
    // Only the city, never anything about the user, and no key without one.
    expect(requests.join(' ')).not.toContain('apikey');
    await weather.forCity('İzmir');
    expect(requests).toHaveLength(2);

    expect(weatherSummary(first!)).toBe(
      'İzmir: şu an 16 °C, nem %84; bugün 14–22 °C, 11 mm yağış; sonraki 2 gün 2–18 °C; don riski var.',
    );
  });

  it('sends the key on the commercial plan', async () => {
    requests.length = 0;
    await provider('ticari-anahtar').forCity('İzmir');
    expect(requests.every((r) => r.includes('apikey=ticari-anahtar'))).toBe(
      true,
    );
  });

  it('gives no weather instead of failing', async () => {
    expect(await provider().forCity('Bilinmeyen')).toBeNull();
    failForecast = true;
    expect(await provider().forCity('İzmir')).toBeNull();
    failForecast = false;
  });
});
