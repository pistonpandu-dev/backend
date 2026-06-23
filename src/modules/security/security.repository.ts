import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export class SecurityRepository {
  async getAlerts(query: any) {
    const { page = 1, limit = 20, level, resolved, deviceId, fromDate, toDate } = query;

    const where: Prisma.SecurityAlertWhereInput = {};

    if (level) {
      where.level = level;
    }

    if (resolved !== undefined) {
      where.resolved = resolved;
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (fromDate) {
      where.createdAt = { gte: new Date(fromDate) };
    }

    if (toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
    }

    const [data, total] = await Promise.all([
      prisma.securityAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          device: {
            select: {
              id: true,
              deviceId: true,
              deviceName: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.securityAlert.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAlertById(id: string) {
    return await prisma.securityAlert.findUnique({
      where: { id },
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateAlert(id: string, data: any) {
    return await prisma.securityAlert.update({
      where: { id },
      data,
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getStats() {
    const [total, byLevel, resolved, critical] = await Promise.all([
      prisma.securityAlert.count(),
      prisma.securityAlert.groupBy({
        by: ['level'],
        _count: true,
      }),
      prisma.securityAlert.count({
        where: { resolved: true },
      }),
      prisma.securityAlert.count({
        where: {
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
    };
  }

  async getRecentAlerts(limit: number) {
    return await prisma.securityAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
      },
    });
  }

  async getThreatCount() {
    return await prisma.securityAlert.count({
      where: {
        level: { in: ['high', 'critical'] },
        resolved: false,
      },
    });
  }

  async getResolvedCount() {
    return await prisma.securityAlert.count({
      where: { resolved: true },
    });
  }

  async getCriticalCount() {
    return await prisma.securityAlert.count({
      where: {
        level: 'critical',
        resolved: false,
      },
    });
  }

  async getRecentAuditLogs(limit: number) {
    return await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getRecentNotifications(limit: number) {
    return await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
      },
    });
  }

  async getRecentSecurityAlerts(limit: number) {
    return await prisma.securityAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
      },
    });
  }

  async getStatistics() {
    const [total, critical, high, medium, low] = await Promise.all([
      prisma.securityAlert.count(),
      prisma.securityAlert.count({ where: { level: 'critical', resolved: false } }),
      prisma.securityAlert.count({ where: { level: 'high', resolved: false } }),
      prisma.securityAlert.count({ where: { level: 'medium', resolved: false } }),
      prisma.securityAlert.count({ where: { level: 'low', resolved: false } }),
    ]);

    return {
      total,
      critical,
      high,
      medium,
      low,
    };
  }
}

export const securityRepository = new SecurityRepository();
