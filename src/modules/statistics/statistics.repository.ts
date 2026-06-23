import { prisma } from '../../config/database';

export class StatisticsRepository {
  async getDeviceStats(period: string) {
    const startDate = this.getStartDate(period);

    const [total, online, offline, newDevices] = await Promise.all([
      prisma.device.count({ where: { deletedAt: null } }),
      prisma.device.count({ where: { status: 'online', deletedAt: null } }),
      prisma.device.count({ where: { status: 'offline', deletedAt: null } }),
      prisma.device.count({
        where: {
          createdAt: { gte: startDate },
          deletedAt: null,
        },
      }),
    ]);

    // Get devices by brand
    const byBrand = await prisma.device.groupBy({
      by: ['brand'],
      where: { deletedAt: null },
      _count: true,
    });

    return {
      total,
      online,
      offline,
      newDevices,
      byBrand: byBrand.filter(b => b.brand !== null),
      period,
      timestamp: new Date().toISOString(),
    };
  }

  async getMonitoringStats(deviceId: string, period: string) {
    const startDate = this.getStartDate(period);

    const where = {
      deviceId,
      createdAt: { gte: startDate },
    };

    const [avg, min, max, count] = await Promise.all([
      prisma.deviceMonitoring.aggregate({
        where,
        _avg: {
          batteryLevel: true,
          cpuUsage: true,
          temperature: true,
        },
      }),
      prisma.deviceMonitoring.aggregate({
        where,
        _min: {
          batteryLevel: true,
          cpuUsage: true,
          temperature: true,
        },
      }),
      prisma.deviceMonitoring.aggregate({
        where,
        _max: {
          batteryLevel: true,
          cpuUsage: true,
          temperature: true,
        },
      }),
      prisma.deviceMonitoring.count({ where }),
    ]);

    // Get hourly averages
    const hourlyData = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('hour', "createdAt") as hour,
        AVG("batteryLevel") as avg_battery,
        AVG("cpuUsage") as avg_cpu,
        AVG(temperature) as avg_temp
      FROM "device_monitoring"
      WHERE "deviceId" = ${deviceId}
        AND "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('hour', "createdAt")
      ORDER BY hour ASC
    `;

    return {
      averages: avg._avg,
      min: min._min,
      max: max._max,
      count,
      hourlyData,
      period,
      timestamp: new Date().toISOString(),
    };
  }

  async getLocationStats(deviceId: string, period: string) {
    const startDate = this.getStartDate(period);

    const where = {
      deviceId,
      createdAt: { gte: startDate },
    };

    const [count, latest] = await Promise.all([
      prisma.location.count({ where }),
      prisma.location.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Get daily location count
    const dailyData = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as day,
        COUNT(*) as count
      FROM locations
      WHERE "deviceId" = ${deviceId}
        AND "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `;

    return {
      total: count,
      latest,
      dailyData,
      period,
      timestamp: new Date().toISOString(),
    };
  }

  async getSecurityStats(period: string) {
    const startDate = this.getStartDate(period);

    const where = {
      createdAt: { gte: startDate },
    };

    const [total, byLevel, resolved, critical] = await Promise.all([
      prisma.securityAlert.count({ where }),
      prisma.securityAlert.groupBy({
        by: ['level'],
        where,
        _count: true,
      }),
      prisma.securityAlert.count({
        where: {
          ...where,
          resolved: true,
        },
      }),
      prisma.securityAlert.count({
        where: {
          ...where,
          level: 'critical',
          resolved: false,
        },
      }),
    ]);

    return {
      total,
      byLevel,
      resolved,
      critical,
      period,
      timestamp: new Date().toISOString(),
    };
  }

  async getUsageStats(period: string) {
    const startDate = this.getStartDate(period);

    const [sessions, files, notifications] = await Promise.all([
      prisma.remoteSession.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.file.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.notification.count({
        where: { createdAt: { gte: startDate } },
      }),
    ]);

    // Get daily usage
    const dailyUsage = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as day,
        COUNT(*) as total_activities
      FROM audit_logs
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `;

    return {
      sessions,
      files,
      notifications,
      dailyUsage,
      period,
      timestamp: new Date().toISOString(),
    };
  }

  async getOverallStats() {
    const [totalDevices, onlineDevices, totalAlerts, totalSessions] = await Promise.all([
      prisma.device.count({ where: { deletedAt: null } }),
      prisma.device.count({ where: { status: 'online', deletedAt: null } }),
      prisma.securityAlert.count({ where: { resolved: false } }),
      prisma.remoteSession.count({ where: { status: 'active' } }),
    ]);

    return {
      totalDevices,
      onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      activeAlerts: totalAlerts,
      activeSessions: totalSessions,
      healthScore: totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 0,
      timestamp: new Date().toISOString(),
    };
  }

  private getStartDate(period: string): Date {
    const periods: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    const duration = periods[period] || periods.day;
    return new Date(Date.now() - duration);
  }
}

export const statisticsRepository = new StatisticsRepository();
