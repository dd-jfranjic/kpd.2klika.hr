import { z } from 'zod';
import Redis from 'ioredis';
import pino from 'pino';
import type { PrismaClient } from '@prisma/client';

const logger = pino({ name: 'metering' });

// Usage event schema
export const UsageEventSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().optional(),
  eventType: z.enum([
    'classification',
    'batch_classification',
    'api_call',
    'export',
    'search',
  ]),
  quantity: z.number().int().positive().default(1),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
});

export type UsageEvent = z.infer<typeof UsageEventSchema>;

// Usage summary schema
export const UsageSummarySchema = z.object({
  tenantId: z.string().uuid(),
  period: z.string(),
  classifications: z.number().int().default(0),
  batchClassifications: z.number().int().default(0),
  apiCalls: z.number().int().default(0),
  exports: z.number().int().default(0),
  searches: z.number().int().default(0),
  totalTokensUsed: z.number().int().default(0),
});

export type UsageSummary = z.infer<typeof UsageSummarySchema>;

// Plan limits
export interface PlanLimits {
  classificationsPerMonth: number;
  apiCallsPerMonth: number;
  exportsPerMonth: number;
  batchProcessing: boolean;
  maxBatchSize: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    classificationsPerMonth: 100,
    apiCallsPerMonth: 500,
    exportsPerMonth: 10,
    batchProcessing: false,
    maxBatchSize: 1,
  },
  starter: {
    classificationsPerMonth: 1000,
    apiCallsPerMonth: 5000,
    exportsPerMonth: 100,
    batchProcessing: true,
    maxBatchSize: 10,
  },
  professional: {
    classificationsPerMonth: 10000,
    apiCallsPerMonth: 50000,
    exportsPerMonth: 1000,
    batchProcessing: true,
    maxBatchSize: 100,
  },
  enterprise: {
    classificationsPerMonth: -1,
    apiCallsPerMonth: -1,
    exportsPerMonth: -1,
    batchProcessing: true,
    maxBatchSize: 1000,
  },
};

// Metering service configuration
export interface MeteringConfig {
  prisma: PrismaClient;
  redis?: Redis;
  cachePrefix?: string;
}

export class MeteringService {
  private prisma: PrismaClient;
  private redis?: Redis;
  private cachePrefix: string;

  constructor(config: MeteringConfig) {
    this.prisma = config.prisma;
    this.redis = config.redis;
    this.cachePrefix = config.cachePrefix || 'meter:';
  }

  async recordUsage(event: UsageEvent): Promise<void> {
    const validatedEvent = UsageEventSchema.parse(event);

    try {
      await (this.prisma as any).usageRecord.create({
        data: {
          organizationId: validatedEvent.tenantId,
          userId: validatedEvent.userId,
          eventType: validatedEvent.eventType,
          quantity: validatedEvent.quantity,
          metadata: validatedEvent.metadata || {},
          recordedAt: validatedEvent.timestamp,
        },
      });

      if (this.redis) {
        const period = this.getCurrentPeriod();
        const key = `${this.cachePrefix}${validatedEvent.tenantId}:${period}:${validatedEvent.eventType}`;
        await this.redis.incrby(key, validatedEvent.quantity);
        await this.redis.expire(key, 35 * 24 * 60 * 60);
      }

      logger.debug({
        msg: 'Usage recorded',
        tenantId: validatedEvent.tenantId,
        eventType: validatedEvent.eventType,
        quantity: validatedEvent.quantity,
      });
    } catch (error) {
      logger.error({ msg: 'Failed to record usage', error, event: validatedEvent });
      throw error;
    }
  }

  async getCurrentUsage(tenantId: string): Promise<UsageSummary> {
    const period = this.getCurrentPeriod();
    return this.getUsageForPeriod(tenantId, period);
  }

  async getUsageForPeriod(tenantId: string, period: string): Promise<UsageSummary> {
    if (this.redis) {
      const summary = await this.getUsageFromRedis(tenantId, period);
      if (summary) return summary;
    }
    return this.getUsageFromDatabase(tenantId, period);
  }

  async canPerformAction(
    tenantId: string,
    eventType: UsageEvent['eventType'],
    quantity: number = 1
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const tenant = await (this.prisma as any).organization.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    const plan = tenant.subscription?.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    let limit: number;
    switch (eventType) {
      case 'classification':
      case 'batch_classification':
        limit = limits.classificationsPerMonth;
        break;
      case 'api_call':
        limit = limits.apiCallsPerMonth;
        break;
      case 'export':
        limit = limits.exportsPerMonth;
        break;
      default:
        limit = -1;
    }

    if (limit === -1) {
      return { allowed: true, remaining: -1, limit: -1 };
    }

    const usage = await this.getCurrentUsage(tenantId);
    const currentUsage = this.getUsageCount(usage, eventType);
    const remaining = Math.max(0, limit - currentUsage);

    return {
      allowed: remaining >= quantity,
      remaining,
      limit,
    };
  }

  async getUsageHistory(tenantId: string, periods: number = 6): Promise<UsageSummary[]> {
    const results: UsageSummary[] = [];
    const now = new Date();

    for (let i = 0; i < periods; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const summary = await this.getUsageForPeriod(tenantId, period);
      results.push(summary);
    }

    return results;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async getUsageFromRedis(tenantId: string, period: string): Promise<UsageSummary | null> {
    if (!this.redis) return null;

    try {
      const keys = [
        `${this.cachePrefix}${tenantId}:${period}:classification`,
        `${this.cachePrefix}${tenantId}:${period}:batch_classification`,
        `${this.cachePrefix}${tenantId}:${period}:api_call`,
        `${this.cachePrefix}${tenantId}:${period}:export`,
        `${this.cachePrefix}${tenantId}:${period}:search`,
      ];

      const values = await this.redis.mget(...keys);
      const hasValues = values.some((v) => v !== null);

      if (!hasValues) return null;

      return {
        tenantId,
        period,
        classifications: parseInt(values[0] || '0', 10),
        batchClassifications: parseInt(values[1] || '0', 10),
        apiCalls: parseInt(values[2] || '0', 10),
        exports: parseInt(values[3] || '0', 10),
        searches: parseInt(values[4] || '0', 10),
        totalTokensUsed: 0,
      };
    } catch {
      return null;
    }
  }

  private async getUsageFromDatabase(tenantId: string, period: string): Promise<UsageSummary> {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await (this.prisma as any).usageRecord.groupBy({
      by: ['eventType'],
      where: {
        organizationId: tenantId,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const summary: UsageSummary = {
      tenantId,
      period,
      classifications: 0,
      batchClassifications: 0,
      apiCalls: 0,
      exports: 0,
      searches: 0,
      totalTokensUsed: 0,
    };

    for (const record of records) {
      const count = record._sum.quantity || 0;
      switch (record.eventType) {
        case 'classification':
          summary.classifications = count;
          break;
        case 'batch_classification':
          summary.batchClassifications = count;
          break;
        case 'api_call':
          summary.apiCalls = count;
          break;
        case 'export':
          summary.exports = count;
          break;
        case 'search':
          summary.searches = count;
          break;
      }
    }

    return summary;
  }

  private getUsageCount(usage: UsageSummary, eventType: UsageEvent['eventType']): number {
    switch (eventType) {
      case 'classification':
        return usage.classifications;
      case 'batch_classification':
        return usage.batchClassifications;
      case 'api_call':
        return usage.apiCalls;
      case 'export':
        return usage.exports;
      case 'search':
        return usage.searches;
      default:
        return 0;
    }
  }
}

export function createMeteringService(config: MeteringConfig): MeteringService {
  return new MeteringService(config);
}
