import { Logger } from '@nestjs/common';

import { type CityWeather, WeatherProvider } from './weather-provider.js';

export interface OpenMeteoConfig {
  /** Commercial plan; without it the free, non-commercial endpoints. */
  apiKey?: string;
  /** Overridable for tests. */
  forecastUrl?: string;
  geocodingUrl?: string;
}

interface GeocodingResponse {
  results?: { latitude?: number; longitude?: number; country_code?: string }[];
}

interface ForecastResponse {
  current?: { temperature_2m?: number; relative_humidity_2m?: number };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
}

const FORECAST_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 3000;
const DAYS = 3;

/**
 * Open-Meteo: the province centre found by name once, then a 3-day
 * forecast cached per city for an hour. A failure only means no weather
 * line; the assistant answers anyway.
 */
export class OpenMeteoWeatherProvider extends WeatherProvider {
  readonly name = 'open-meteo';
  private readonly logger = new Logger('OpenMeteo');
  private readonly places = new Map<
    string,
    { latitude: number; longitude: number }
  >();
  private readonly forecasts = new Map<
    string,
    { at: number; weather: CityWeather }
  >();

  constructor(private readonly config: OpenMeteoConfig = {}) {
    super();
  }

  private url(kind: 'forecast' | 'geocoding', path: string) {
    const commercial = this.config.apiKey ? 'customer-' : '';
    const base =
      kind === 'forecast'
        ? (this.config.forecastUrl ?? `https://${commercial}api.open-meteo.com`)
        : (this.config.geocodingUrl ??
          `https://${commercial}geocoding-api.open-meteo.com`);
    const url = new URL(path, base);
    if (this.config.apiKey) url.searchParams.set('apikey', this.config.apiKey);
    return url;
  }

  private async get<T>(url: URL): Promise<T> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  }

  private async place(city: string) {
    const known = this.places.get(city);
    if (known) return known;
    const url = this.url('geocoding', '/v1/search');
    url.searchParams.set('name', city);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'tr');
    url.searchParams.set('countryCode', 'TR');
    const body = await this.get<GeocodingResponse>(url);
    const hit = body.results?.find((r) => r.country_code === 'TR');
    if (
      typeof hit?.latitude !== 'number' ||
      typeof hit.longitude !== 'number'
    ) {
      return null;
    }
    const place = { latitude: hit.latitude, longitude: hit.longitude };
    this.places.set(city, place);
    return place;
  }

  async forCity(city: string): Promise<CityWeather | null> {
    const cached = this.forecasts.get(city);
    if (cached && Date.now() - cached.at < FORECAST_TTL_MS)
      return cached.weather;
    try {
      const place = await this.place(city);
      if (!place) return null;
      const url = this.url('forecast', '/v1/forecast');
      url.searchParams.set('latitude', String(place.latitude));
      url.searchParams.set('longitude', String(place.longitude));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m');
      url.searchParams.set(
        'daily',
        'temperature_2m_max,temperature_2m_min,precipitation_sum',
      );
      url.searchParams.set('timezone', 'Europe/Istanbul');
      url.searchParams.set('forecast_days', String(DAYS));
      const body = await this.get<ForecastResponse>(url);
      const daily = body.daily ?? {};
      const days = (daily.time ?? []).flatMap((date, i) => {
        const min = daily.temperature_2m_min?.[i];
        const max = daily.temperature_2m_max?.[i];
        if (typeof min !== 'number' || typeof max !== 'number') return [];
        return [
          { date, min, max, precipitation: daily.precipitation_sum?.[i] ?? 0 },
        ];
      });
      const current = body.current;
      const weather: CityWeather = {
        city,
        now:
          typeof current?.temperature_2m === 'number' &&
          typeof current.relative_humidity_2m === 'number'
            ? {
                temperature: current.temperature_2m,
                humidity: current.relative_humidity_2m,
              }
            : null,
        days,
      };
      this.forecasts.set(city, { at: Date.now(), weather });
      return weather;
    } catch (error) {
      this.logger.warn(`weather for ${city}: ${String(error)}`);
      return null;
    }
  }
}
