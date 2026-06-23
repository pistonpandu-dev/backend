import { deviceRepository } from '../devices/device.repository';
import { monitoringRepository } from '../monitoring/monitoring.repository';
import { locationRepository } from '../locations/location.repository';
import { sessionRepository } from '../remote-session/session.repository';
import { securityRepository } from '../security/security.repository';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

export class DashboardService {
  private static instance: DashboardService;

  private constructor() {}

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async getDashboardStats() {
    const redis = getRedisClient();
    const cacheKey = 'dashboard:stats';

    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      deviceStats,
      monitoringStats,
      locationStats,
      sessionStats,
      securityStats,
    ] = await Promise.all([
      deviceRepository.getStatistics(),
      monitoringRepository.getStatistics(),
      locationRepository.getStatistics(),
      sessionRepository.getStatistics(),
      securityRepository.getStatistics(),
    ]);

    const stats = {
      devices: deviceStats,
      monitoring: monitoringStats,
      locations: locationStats,
      sessions: sessionStats,
      security: securityStats,
      timestamp: new Date().toISOString(),
    };

    // Cache for 60 seconds
    await redis.setEx(cacheKey, 60, JSON.stringify(stats));

    return stats;
  }

  async getDeviceAnalytics(period: string) {
    const periods = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const duration = periods[period as keyof typeof periods] || periods.day;
    const startDate = new Date(Date.now() - duration);

    return await deviceRepository.getAnalytics(startDate);
  }

  async getSecurityOverview() {
    const [alerts, threats, resolved, critical] = await Promise.all([
      securityRepository.getRecentAlerts(10),
      securityRepository.getThreatCount(),
      securityRepository.getResolvedCount(),
      securityRepository.getCriticalCount(),
    ]);

    return {
      recentAlerts: alerts,
      threats,
      resolved,
      critical,
      status: critical > 0 ? 'critical' : threats > 0 ? 'warning' : 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  async getActivityFeed(limit: number) {
    const [auditLogs, notifications, securityAlerts] = await Promise.all([
      securityRepository.getRecentAuditLogs(limit),
      securityRepository.getRecentNotifications(limit),
      securityRepository.getRecentSecurityAlerts(limit),
    ]);

    // Combine and sort by date
    const feed = [
      ...auditLogs.map(log => ({
        ...log,
        type: 'audit' as const,
        timestamp: log.createdAt,
      })),
      ...notifications.map(notif => ({
        ...notif,
        type: 'notification' as const,
        timestamp: notif.createdAt,
      })),
      ...securityAlerts.map(alert => ({
        ...alert,
        type: 'security' as const,
        timestamp: alert.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return feed;
  }

  async getLocationHeatmap() {
    return await locationRepository.getHeatmapData();
  }
}
