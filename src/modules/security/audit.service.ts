import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';

export class SecurityAuditService {
  private static instance: SecurityAuditService;

  static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  // Log security event
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
      await redis.lTrim(key, 0, 999); // Keep last 1000 events

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

  // Get recent security events
  async getSecurityEvents(filters: {
    startDate?: Date;
    endDate?: Date;
    level?: string[];
    module?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const { startDate, endDate, level, module, limit = 100, offset = 0 } = filters;

    const where: any = {};

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: endDate };
    }

    if (level && level.length > 0) {
      where.level = { in: level };
    }

    if (module) {
      where.module = module;
    }

    const events = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
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

    const total = await prisma.auditLog.count({ where });

    return {
      data: events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  // Get security statistics
  async getSecurityStats(days: number = 7): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await prisma.$transaction([
      // Total security events
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // Events by level
      prisma.auditLog.groupBy({
        by: ['module'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),
      
      // Critical alerts
      prisma.securityAlert.count({
        where: {
          level: { in: ['high', 'critical'] },
          createdAt: { gte: startDate },
          resolved: false,
        },
      }),
      
      // Top actions
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalEvents: stats[0],
      eventsByModule: stats[1],
      criticalAlerts: stats[2],
      topActions: stats[3],
    };
  }

  // Check for suspicious patterns
  async checkSuspiciousActivity(adminId: string, ipAddress: string): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let suspicious = false;
    const redis = getRedisClient();

    // Check login attempts
    const loginKey = `login_attempts:${adminId}`;
    const loginAttempts = parseInt(await redis.get(loginKey) || '0');
    
    if (loginAttempts > 10) {
      reasons.push('Multiple login attempts detected');
      suspicious = true;
    }

    // Check failed attempts
    const failedKey = `failed_attempts:${ipAddress}`;
    const failedAttempts = parseInt(await redis.get(failedKey) || '0');
    
    if (failedAttempts > 5) {
      reasons.push('Multiple failed attempts from same IP');
      suspicious = true;
    }

    // Check time between actions
    const lastActionKey = `last_action:${adminId}`;
    const lastAction = await redis.get(lastActionKey);
    
    if (lastAction) {
      const timeSinceLastAction = Date.now() - parseInt(lastAction);
      if (timeSinceLastAction < 1000) { // Less than 1 second between actions
        reasons.push('Unusually fast actions detected');
        suspicious = true;
      }
    }

    // Check action frequency
    const actionKey = `action_frequency:${adminId}`;
    const actionCount = parseInt(await redis.get(actionKey) || '0');
    const newCount = actionCount + 1;
    
    await redis.setEx(actionKey, 60, newCount.toString());
    
    if (newCount > 60) { // More than 60 actions per minute
      reasons.push('Excessive action frequency');
      suspicious = true;
    }

    if (suspicious) {
      // Log suspicious activity
      await this.logSecurityEvent({
        adminId,
        action: 'suspicious_activity_detected',
        module: 'security',
        level: 'high',
        description: reasons.join(', '),
        ipAddress,
        metadata: { reasons },
      });
    }

    return { suspicious, reasons };
  }
}
