import { z } from 'zod';
import Redis from 'ioredis';
import type { PrismaClient } from '@prisma/client';

// Feature flag schema
export const FeatureFlagSchema = z.object({
  key: z.string().min(1).max(100),
  enabled: z.boolean(),
  description: z.string().optional(),
  tenantOverrides: z.record(z.string(), z.boolean()).optional(),
  userOverrides: z.record(z.string(), z.boolean()).optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

// Configuration for feature flags service
export interface FeatureFlagsConfig {
  prisma: PrismaClient;
  redis?: Redis;
  cachePrefix?: string;
  cacheTTL?: number; // seconds
  defaultFlags?: Record<string, boolean>;
}

// Feature flags evaluation context
export interface EvaluationContext {
  userId?: string;
  tenantId?: string;
  userAttributes?: Record<string, unknown>;
}

export class FeatureFlagsService {
  private prisma: PrismaClient;
  private redis?: Redis;
  private cachePrefix: string;
  private cacheTTL: number;
  private defaultFlags: Record<string, boolean>;
  private localCache: Map<string, { value: boolean; expiresAt: number }> = new Map();

  constructor(config: FeatureFlagsConfig) {
    this.prisma = config.prisma;
    this.redis = config.redis;
    this.cachePrefix = config.cachePrefix || 'ff:';
    this.cacheTTL = config.cacheTTL || 300; // 5 minutes
    this.defaultFlags = config.defaultFlags || {};
  }

  /**
   * Check if a feature is enabled
   */
  async isEnabled(key: string, context?: EvaluationContext): Promise<boolean> {
    // Check local cache first
    const cached = this.getFromLocalCache(key, context);
    if (cached !== undefined) {
      return cached;
    }

    // Check Redis cache
    if (this.redis) {
      const redisCached = await this.getFromRedisCache(key, context);
      if (redisCached !== undefined) {
        this.setLocalCache(key, redisCached, context);
        return redisCached;
      }
    }

    // Fetch from database
    const flag = await this.getFlag(key);
    if (!flag) {
      return this.defaultFlags[key] ?? false;
    }

    const result = this.evaluateFlag(flag, context);

    // Cache the result
    this.setLocalCache(key, result, context);
    if (this.redis) {
      await this.setRedisCache(key, result, context);
    }

    return result;
  }

  /**
   * Get a feature flag from database
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    try {
      const flag = await (this.prisma as any).featureFlag.findUnique({
        where: { key },
      });

      if (!flag) return null;

      return {
        key: flag.key,
        enabled: flag.enabled,
        description: flag.description || undefined,
        tenantOverrides: flag.tenantOverrides as Record<string, boolean> | undefined,
        userOverrides: flag.userOverrides as Record<string, boolean> | undefined,
        rolloutPercentage: flag.rolloutPercentage || undefined,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const flags = await (this.prisma as any).featureFlag.findMany({
        orderBy: { key: 'asc' },
      });

      return flags.map((flag: any) => ({
        key: flag.key,
        enabled: flag.enabled,
        description: flag.description || undefined,
        tenantOverrides: flag.tenantOverrides as Record<string, boolean> | undefined,
        userOverrides: flag.userOverrides as Record<string, boolean> | undefined,
        rolloutPercentage: flag.rolloutPercentage || undefined,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Set a feature flag
   */
  async setFlag(
    key: string,
    enabled: boolean,
    options?: {
      description?: string;
      tenantOverrides?: Record<string, boolean>;
      userOverrides?: Record<string, boolean>;
      rolloutPercentage?: number;
    }
  ): Promise<FeatureFlag> {
    const flag = await (this.prisma as any).featureFlag.upsert({
      where: { key },
      create: {
        key,
        enabled,
        description: options?.description,
        tenantOverrides: options?.tenantOverrides || {},
        userOverrides: options?.userOverrides || {},
        rolloutPercentage: options?.rolloutPercentage,
      },
      update: {
        enabled,
        description: options?.description,
        tenantOverrides: options?.tenantOverrides,
        userOverrides: options?.userOverrides,
        rolloutPercentage: options?.rolloutPercentage,
        updatedAt: new Date(),
      },
    });

    // Invalidate caches
    this.localCache.clear();
    if (this.redis) {
      const pattern = `${this.cachePrefix}${key}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }

    return {
      key: flag.key,
      enabled: flag.enabled,
      description: flag.description || undefined,
      tenantOverrides: flag.tenantOverrides as Record<string, boolean> | undefined,
      userOverrides: flag.userOverrides as Record<string, boolean> | undefined,
      rolloutPercentage: flag.rolloutPercentage || undefined,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
    };
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    await (this.prisma as any).featureFlag.delete({
      where: { key },
    });

    // Invalidate caches
    this.localCache.clear();
    if (this.redis) {
      const pattern = `${this.cachePrefix}${key}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  /**
   * Evaluate a flag based on context
   */
  private evaluateFlag(flag: FeatureFlag, context?: EvaluationContext): boolean {
    // Check user override first
    if (context?.userId && flag.userOverrides?.[context.userId] !== undefined) {
      return flag.userOverrides[context.userId];
    }

    // Check tenant override
    if (context?.tenantId && flag.tenantOverrides?.[context.tenantId] !== undefined) {
      return flag.tenantOverrides[context.tenantId];
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      if (!context?.userId) {
        return flag.enabled && Math.random() * 100 < flag.rolloutPercentage;
      }
      // Deterministic rollout based on user ID
      const hash = this.hashString(context.userId + flag.key);
      return flag.enabled && hash % 100 < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  /**
   * Simple string hash for deterministic rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getCacheKey(key: string, context?: EvaluationContext): string {
    let cacheKey = `${this.cachePrefix}${key}`;
    if (context?.tenantId) cacheKey += `:t:${context.tenantId}`;
    if (context?.userId) cacheKey += `:u:${context.userId}`;
    return cacheKey;
  }

  private getFromLocalCache(key: string, context?: EvaluationContext): boolean | undefined {
    const cacheKey = this.getCacheKey(key, context);
    const cached = this.localCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    if (cached) {
      this.localCache.delete(cacheKey);
    }
    return undefined;
  }

  private setLocalCache(key: string, value: boolean, context?: EvaluationContext): void {
    const cacheKey = this.getCacheKey(key, context);
    this.localCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.cacheTTL * 1000,
    });
  }

  private async getFromRedisCache(key: string, context?: EvaluationContext): Promise<boolean | undefined> {
    if (!this.redis) return undefined;
    try {
      const cacheKey = this.getCacheKey(key, context);
      const value = await this.redis.get(cacheKey);
      if (value === null) return undefined;
      return value === 'true';
    } catch {
      return undefined;
    }
  }

  private async setRedisCache(key: string, value: boolean, context?: EvaluationContext): Promise<void> {
    if (!this.redis) return;
    try {
      const cacheKey = this.getCacheKey(key, context);
      await this.redis.setex(cacheKey, this.cacheTTL, value ? 'true' : 'false');
    } catch {
      // Ignore cache errors
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.localCache.clear();
    if (this.redis) {
      const pattern = `${this.cachePrefix}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}

// Factory function
export function createFeatureFlagsService(config: FeatureFlagsConfig): FeatureFlagsService {
  return new FeatureFlagsService(config);
}

// Default feature flags for the KPD system
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  'ai.classification': true,
  'ai.batch-processing': false,
  'ai.advanced-suggestions': false,
  'export.csv': true,
  'export.excel': true,
  'export.pdf': false,
  'api.v2': false,
  'billing.stripe': false,
  'notifications.email': true,
  'notifications.webhook': false,
};
