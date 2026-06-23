import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

export class CacheService {
  private static instance: CacheService;
  private redis = getRedisClient();

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const data = JSON.stringify(value);
      if (ttl) {
        await this.redis.setEx(key, ttl, data);
      } else {
        await this.redis.set(key, data);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      return await this.redis.decr(key);
    } catch (error) {
      logger.error('Cache decrement error:', error);
      return 0;
    }
  }

  // Cache device data
  async cacheDevice(deviceId: string, deviceData: any, ttl: number = 300): Promise<void> {
    await this.set(`device:${deviceId}`, deviceData, ttl);
  }

  async getCachedDevice(deviceId: string): Promise<any> {
    return await this.get(`device:${deviceId}`);
  }

  // Cache monitoring data
  async cacheMonitoring(deviceId: string, data: any, ttl: number = 60): Promise<void> {
    await this.set(`monitoring:${deviceId}`, data, ttl);
  }

  async getCachedMonitoring(deviceId: string): Promise<any> {
    return await this.get(`monitoring:${deviceId}`);
  }

  // Cache session
  async cacheSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    await this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async getCachedSession(sessionId: string): Promise<any> {
    return await this.get(`session:${sessionId}`);
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const count = await this.increment(key);
    if (count === 1) {
      await this.redis.expire(key, window);
    }
    return count <= limit;
  }
}

export const cacheService = CacheService.getInstance();
