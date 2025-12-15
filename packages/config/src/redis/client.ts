import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

/**
 * Redis Client Singleton
 * Prevents multiple connections during hot-reload
 */
function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  client.on('error', (error) => {
    console.error('❌ Redis error:', error.message);
  });

  client.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  return client;
}

export const redis = global.redis || createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  global.redis = redis;
}

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
