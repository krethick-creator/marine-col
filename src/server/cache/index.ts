import Redis from 'ioredis';
import { config } from 'dotenv';

config(); // Load environment variables from .env

if (!process.env.REDIS_URL) {
  console.log('Redis unavailable — running without cache.');
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a Redis client instance
export const redis = new Redis(redisUrl, {
  // Retry strategy for robust reconnections, but limit to prevent infinite loops when optional
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying after 3 times if it's strictly optional
    return Math.min(times * 100, 1000);
  },
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false, // Don't block promises when disconnected
});

let hasLoggedRedisError = false;

redis.on('error', (err: any) => {
  if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
    if (!hasLoggedRedisError) {
      console.log('Redis unavailable — running without cache.');
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
