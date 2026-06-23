import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';

export class AuditService {
  private static instance: AuditService;

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logSecurityEvent(data: {
    adminId?: string;
    deviceId?: string;
    action: string;
    module: string;
    level: string;
    description: string;
    metadata?: any;
    ipAddress?: string;
  }): Promise<void> {
    try {
      // Create audit log
      await prisma.auditLog.create({
        data: {
          adminId: data.adminId,
          action: data.action,
          module: data.module,
          ipAddress: data.ipAddress,
          metadata: {
            level: data.level,
            description: data.description,
            ...data.metadata,
          },
        },
      });

      // If security level is high, create security alert
      if (data.level === 'high' || data.level === 'critical') {
        await prisma.securityAlert.create({
          data: {
            deviceId: data.deviceId,
            adminId: data.adminId,
            level: data.level as any,
            title: data.action,
            description: data.description,
            metadata: data.metadata,
          },
        });
      }

      // Log to Redis for real-time monitoring
      const redis = getRedisClient();
      const key = `security_events:${new Date().toISOString().split('T')[0]}`;
      await redis.lPush(key, JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
      }));
      await redis.lTrim(key, 0, 999);

      // Log to file
      logger.info('Security event logged', {
        action: data.action,
        level: data.level,
        module: data.module,
        adminId: data.adminId,
        deviceId: data.deviceId,
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  async getAuditLogs(filters: any) {
    const { page = 1, limit = 50, startDate, endDate, module, action, adminId } = filters;

    const where: any = {};

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (adminId) {
      where.adminId = adminId;
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
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
      }),
      prisma.auditLog.count({ where }),
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
}
