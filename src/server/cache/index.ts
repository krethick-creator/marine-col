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

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});
