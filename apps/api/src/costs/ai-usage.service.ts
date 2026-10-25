import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DAY_MS, istanbulDate, istanbulDayStart } from '../care/season.js';
import type { Env } from '../config/env.js';
import type { AiTask } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { claudeCostUsd, type TokenUsage } from './prices.js';

export interface UsageRecord {
  task: AiTask;
  /** The driver that served it: "fake" costs nothing. */
  provider: string;
  model?: string;
  usage?: TokenUsage;
  userId?: number;
}

/**
 * One row per paid provider call, priced when it is made (ADR 0015).
 * Recording never fails the request it belongs to.
 */
@Injectable()
export class AiUsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  costOf(record: UsageRecord) {
    if (record.provider === 'kindwise') {
      return this.config.get('KINDWISE_USD_PER_CALL', { infer: true });
    }
    if (record.provider === 'anthropic' && record.model && record.usage) {
      return claudeCostUsd(record.model, record.usage);
    }
    return 0;
  }

  async record(record: UsageRecord) {
    await this.prisma.aiUsage
      .create({
        data: {
          task: record.task,
          provider: record.provider,
          model: record.model ?? null,
          inputTokens: record.usage?.inputTokens ?? 0,
          outputTokens: record.usage?.outputTokens ?? 0,
          cacheReadTokens: record.usage?.cacheReadTokens ?? 0,
          cacheWriteTokens: record.usage?.cacheWriteTokens ?? 0,
          costUsd: this.costOf(record),
          userId: record.userId ?? null,
        },
      })
      .catch(() => undefined);
  }

  /** Spend since midnight in Istanbul. */
  async today() {
    const total = await this.prisma.aiUsage.aggregate({
      where: { createdAt: { gte: istanbulDayStart() } },
      _sum: { costUsd: true },
    });
    return total._sum.costUsd ?? 0;
  }

  /** Per Istanbul day and task, newest day first. */
  async daily(days: number) {
    const since = new Date(istanbulDayStart().getTime() - (days - 1) * DAY_MS);
    const rows = await this.prisma.aiUsage.findMany({
      where: { createdAt: { gte: since } },
      select: {
        task: true,
        provider: true,
        costUsd: true,
        inputTokens: true,
        outputTokens: true,
        createdAt: true,
      },
    });
    const byDay = new Map<
      string,
      {
        day: string;
        totalUsd: number;
        calls: number;
        tasks: Record<
          string,
          { calls: number; costUsd: number; tokens: number }
        >;
      }
    >();
    for (const row of rows) {
      const day = istanbulDate(row.createdAt);
      const entry = byDay.get(day) ?? { day, totalUsd: 0, calls: 0, tasks: {} };
      const task = (entry.tasks[row.task] ??= {
        calls: 0,
        costUsd: 0,
        tokens: 0,
      });
      task.calls += 1;
      task.costUsd += row.costUsd;
      task.tokens += row.inputTokens + row.outputTokens;
      entry.calls += 1;
      entry.totalUsd += row.costUsd;
      byDay.set(day, entry);
    }
    return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  }
}
