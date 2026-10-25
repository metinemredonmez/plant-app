import { type ExecutionContext, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AUTH_RATE_LIMITED } from './auth/auth.decorators.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { LegacyErrorFilter } from './common/legacy-error.filter.js';
import { type Env, validateEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { OtpModule } from './otp/otp.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PromocodesModule } from './promocodes/promocodes.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { UsersModule } from './users/users.module.js';

const isAuthRateLimited = (context: ExecutionContext) =>
  Reflect.getMetadata(AUTH_RATE_LIMITED, context.getHandler()) === true;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          // KVKK: never log credentials or session cookies.
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          autoLogging: { ignore: (req) => req.url === '/health' },
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
    // Login, sign-up, refresh and the OTP routes (@AuthRateLimited): slows down
    // password guessing and credential stuffing per IP.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            name: 'auth',
            ttl: 60_000,
            limit: config.get('AUTH_RATE_LIMIT', { infer: true }),
            skipIf: (context) => !isAuthRateLimited(context),
          },
        ],
        errorMessage:
          'Çok fazla deneme yaptınız, lütfen bir dakika sonra tekrar deneyin',
      }),
    }),
    PrismaModule,
    MessagingModule,
    AuthModule,
    CatalogModule,
    UsersModule,
    OrdersModule,
    OtpModule,
    ReviewsModule,
    PromocodesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: LegacyErrorFilter },
    // Guards run in this order: rate limit, session, role.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
