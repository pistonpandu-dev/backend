import { statisticsRepository } from './statistics.repository';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

export class StatisticsService {
  private static instance: StatisticsService;

  private constructor() {}

  static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  async getDeviceStatistics(period: string) {
    const redis = getRedisClient();
    const cacheKey = `stats:devices:${period}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await statisticsRepository.getDeviceStats(period);

    // Cache for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(stats));

    return stats;
  }

  async getMonitoringStatistics(deviceId: string, period: string) {
    const redis = getRedisClient();
    const cacheKey = `stats:monitoring:${deviceId}:${period}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await statisticsRepository.getMonitoringStats(deviceId, period);

    await redis.setEx(cacheKey, 300, JSON.stringify(stats));

    return stats;
  }

  async getLocationStatistics(deviceId: string, period: string) {
    const redis = getRedisClient();
    const cacheKey = `stats:location:${deviceId}:${period}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await statisticsRepository.getLocationStats(deviceId, period);

    await redis.setEx(cacheKey, 300, JSON.stringify(stats));

    return stats;
  }

  async getSecurityStatistics(period: string) {
    const redis = getRedisClient();
    const cacheKey = `stats:security:${period}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await statisticsRepository.getSecurityStats(period);

    await redis.setEx(cacheKey, 300, JSON.stringify(stats));

    return stats;
  }

  async getUsageStatistics(period: string) {
    const redis = getRedisClient();
    const cacheKey = `stats:usage:${period}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await statisticsRepository.getUsageStats(period);

    await redis.setEx(cacheKey, 300, JSON.stringify(stats));

    return stats;
  }

  async getOverallStatistics() {
    const redis = getRedisClient();
    const cacheKey = 'stats:overall';

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await statisticsRepository.getOverallStats();

    await redis.setEx(cacheKey, 60, JSON.stringify(stats));

    return stats;
  }
}
