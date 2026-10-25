import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { Public } from '../auth/auth.decorators.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const started = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Veritabanına ulaşılamıyor');
    }
    return {
      status: 'ok',
      db: 'up',
      dbLatencyMs: Math.round(performance.now() - started),
      prisma: Prisma.prismaVersion.client,
    };
  }
}
