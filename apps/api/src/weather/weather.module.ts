import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { FakeWeatherProvider } from './fake.weather-provider.js';
import { OpenMeteoWeatherProvider } from './open-meteo.weather-provider.js';
import { NoWeatherProvider, WeatherProvider } from './weather-provider.js';

@Module({
  providers: [
    {
      provide: WeatherProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        switch (config.get('WEATHER_DRIVER', { infer: true })) {
          case 'open-meteo':
            return new OpenMeteoWeatherProvider({
              apiKey: config.get('WEATHER_API_KEY', { infer: true }),
            });
          case 'fake':
            return new FakeWeatherProvider();
          default:
            return new NoWeatherProvider();
        }
      },
    },
  ],
  exports: [WeatherProvider],
})
export class WeatherModule {}
