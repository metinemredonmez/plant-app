/** A few days of weather for one of the 81 province centres. */
export interface CityWeather {
  city: string;
  now: { temperature: number; humidity: number } | null;
  /** Today first, in Istanbul days. */
  days: { date: string; min: number; max: number; precipitation: number }[];
}

/**
 * City weather. Only the city name leaves the server, never a user: the
 * weather provider receives no personal data (ADR 0014).
 */
export abstract class WeatherProvider {
  abstract readonly name: 'none' | 'fake' | 'open-meteo';
  /** Null when there is no provider or it cannot answer; never throws. */
  abstract forCity(city: string): Promise<CityWeather | null>;
}

/** Until the provider and its licence are chosen. */
export class NoWeatherProvider extends WeatherProvider {
  readonly name = 'none';
  async forCity() {
    return null;
  }
}

// Thresholds for the warning words; the per-species ones come with the
// weather alerts (week 10).
const FROST_C = 2;
const HEAT_C = 35;

const degrees = (value: number) => `${Math.round(value)} °C`;

/** One line for the assistant's context, in Turkish. */
export function weatherSummary(weather: CityWeather) {
  const [today, ...rest] = weather.days;
  const parts: string[] = [];
  if (weather.now) {
    parts.push(
      `şu an ${degrees(weather.now.temperature)}, nem %${Math.round(weather.now.humidity)}`,
    );
  }
  if (today) {
    parts.push(
      `bugün ${Math.round(today.min)}–${degrees(today.max)}${today.precipitation >= 1 ? `, ${Math.round(today.precipitation)} mm yağış` : ''}`,
    );
  }
  if (rest.length) {
    const min = Math.min(...rest.map((day) => day.min));
    const max = Math.max(...rest.map((day) => day.max));
    parts.push(`sonraki ${rest.length} gün ${Math.round(min)}–${degrees(max)}`);
  }
  const all = weather.days;
  if (all.some((day) => day.min <= FROST_C)) parts.push('don riski var');
  if (all.some((day) => day.max >= HEAT_C))
    parts.push('aşırı sıcak bekleniyor');
  return parts.length ? `${weather.city}: ${parts.join('; ')}.` : null;
}
