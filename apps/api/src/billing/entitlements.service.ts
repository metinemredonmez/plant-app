import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import type { Entitlement } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export function isActive(entitlement: Entitlement | null, now = new Date()) {
  if (!entitlement) return false;
  if (entitlement.status === 'EXPIRED') return false;
  return !entitlement.expiresAt || entitlement.expiresAt > now;
}

/**
 * Plan limits; `null` means no limit of that kind. Free: identification per
 * rolling week, trial diagnoses in total, plants. Premium: fair use per day.
 */
export interface Limits {
  identifyPerWeek: number | null;
  diagnosesTotal: number | null;
  scansPerDay: number | null;
  messagesPerMonth: number;
  plants: number | null;
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  limits(premium: boolean): Limits {
    const get = <K extends keyof Env>(key: K) =>
      this.config.get(key, { infer: true });
    return premium
      ? {
          identifyPerWeek: null,
          diagnosesTotal: null,
          scansPerDay: get('PREMIUM_SCANS_PER_DAY'),
          messagesPerMonth: get('PREMIUM_MESSAGES_PER_MONTH'),
          plants: null,
        }
      : {
          identifyPerWeek: get('FREE_IDENTIFY_PER_WEEK'),
          diagnosesTotal: get('FREE_DIAGNOSES'),
          scansPerDay: null,
          messagesPerMonth: get('FREE_MESSAGES_PER_MONTH'),
          plants: get('FREE_PLANTS'),
        };
  }

  async forUser(userId: number) {
    const entitlement = await this.prisma.entitlement.findUnique({
      where: { userId },
    });
    const premium = isActive(entitlement);
    return { premium, entitlement, limits: this.limits(premium) };
  }
}
