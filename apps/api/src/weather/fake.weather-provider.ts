import { istanbulDate } from '../care/season.js';
import { type CityWeather, WeatherProvider } from './weather-provider.js';

/** Development and test stand-in: a mild autumn week everywhere. */
export class FakeWeatherProvider extends WeatherProvider {
  readonly name = 'fake';

  async forCity(city: string): Promise<CityWeather> {
    const day = (offset: number) =>
      istanbulDate(new Date(Date.now() + offset * 24 * 60 * 60 * 1000));
    return {
      city,
      now: { temperature: 16, humidity: 70 },
      days: [
        { date: day(0), min: 11, max: 19, precipitation: 0 },
        { date: day(1), min: 9, max: 18, precipitation: 4 },
        { date: day(2), min: 1, max: 14, precipitation: 0 },
      ],
    };
  }
}
