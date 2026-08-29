import Redis from 'ioredis';
import { config } from 'dotenv';

config(); // Load environment variables from .env

if (!process.env.REDIS_URL) {
  console.warn('REDIS_URL is not set. Falling back to memory cache or mock if applicable.');
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a Redis client instance
export const redis = new Redis(redisUrl, {
  // Retry strategy for robust reconnections
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
});

let hasLoggedRedisError = false;

redis.on('error', (err: any) => {
  if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
    if (!hasLoggedRedisError) {
      console.warn('⚠️ [Redis] Connection refused (is Redis running?). Caching will safely fall back to direct network calls.');
      hasLoggedRedisError = true;
    }
  } else {
    console.error('[Redis] error:', err.message);
  }
});

redis.on('connect', () => {
  hasLoggedRedisError = false;
  console.log('✅ [Redis] Connected successfully');
});
