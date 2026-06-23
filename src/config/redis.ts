import Redis from 'redis';
import { logger } from './logger';

let redisClient: Redis.RedisClientType;

const connectRedis = async (): Promise<void> => {
  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = Redis.createClient({ url });
    
    redisClient.on('error', (error) => {
      logger.error('Redis Client Error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('📦 Redis connected successfully');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
  }
};

const getRedisClient = (): Redis.RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export { connectRedis, getRedisClient };
