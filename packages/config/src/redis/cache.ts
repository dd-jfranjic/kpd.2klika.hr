import { redis } from './client';

/**
 * Cache key prefixes for organization
 */
export const CachePrefix = {
  CONFIG: 'config:',
  SYSTEM_CONFIG: 'config:system:',
  TENANT_CONFIG: 'config:tenant:',
  KPD_CODES: 'kpd:codes:',
  KPD_SEARCH: 'kpd:search:',
  QUERY_RESULT: 'query:result:',
  USER_SESSION: 'user:session:',
  RATE_LIMIT: 'ratelimit:',
  FEATURE_FLAG: 'feature:',
} as const;

/**
 * Generic cache get with JSON parsing
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Generic cache set with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cache key
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete all keys matching pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Cache delete pattern error:', error);
  }
}

/**
 * Get or set cache (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const value = await fetcher();
  await cacheSet(key, value, ttlSeconds);

  return value;
}

/**
 * Increment counter with expiry
 */
export async function cacheIncrement(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  const count = await redis.incr(key);

  // Set expiry only on first increment
  if (count === 1 && ttlSeconds) {
    await redis.expire(key, ttlSeconds);
  }

  return count;
}

/**
 * Rate limiting check
 * Returns: { allowed: boolean, remaining: number, resetIn: number }
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;

  const count = await cacheIncrement(fullKey, windowSeconds);
  const ttl = await redis.ttl(fullKey);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetIn: ttl > 0 ? ttl : windowSeconds,
  };
}

/**
 * Hash operations for complex objects
 */
export const cacheHash = {
  async get<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await redis.hget(key, field);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, field: string, value: T): Promise<void> {
    try {
      await redis.hset(key, field, JSON.stringify(value));
    } catch (error) {
      console.error('Hash set error:', error);
    }
  },

  async getAll<T>(key: string): Promise<Record<string, T>> {
    try {
      const data = await redis.hgetall(key);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch {
          // Skip invalid JSON
        }
      }
      return result;
    } catch {
      return {};
    }
  },

  async delete(key: string, field: string): Promise<void> {
    try {
      await redis.hdel(key, field);
    } catch (error) {
      console.error('Hash delete error:', error);
    }
  },
};
