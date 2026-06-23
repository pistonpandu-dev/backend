import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';
import { SecurityAuditService } from '../modules/security/audit.service';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'unhealthy';
    logger.error('Database health check failed:', error);
  }

  try {
    // Check Redis
    const redis = getRedisClient();
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'unhealthy';
    logger.error('Redis health check failed:', error);
  }

  // Log health check for security audit
  const auditService = SecurityAuditService.getInstance();
  await auditService.logSecurityEvent({
    action: 'health_check',
    module: 'system',
    level: 'info',
    description: 'Health check performed',
    ipAddress: req.ip,
    metadata: health,
  });

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
