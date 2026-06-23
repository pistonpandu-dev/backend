import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

const connectRedis = async (): Promise<Redis> => {
  try {
    if (redisClient) {
      return redisClient;
    }

    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      enableReadyCheck: true,
      lazyConnect: false,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis Client Error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('📦 Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('📦 Redis ready');
    });

    redisClient.on('close', () => {
      logger.warn('📦 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('📦 Redis reconnecting...');
    });

    await redisClient.ping();
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('📦 Redis disconnected');
  }
};

export { connectRedis, getRedisClient, disconnectRedis };
