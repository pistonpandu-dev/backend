import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

class CleanupJob {
  private task: cron.ScheduledTask | null = null;

  async start() {
    // Run every hour
    this.task = cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupExpiredSessions();
        await this.cleanupOldLogs();
        await this.cleanupOldMonitoringData();
        await this.cleanupExpiredDevices();
      } catch (error) {
        logger.error('Cleanup job failed:', error);
      }
    });
  }

  private async cleanupExpiredSessions() {
    const result = await prisma.adminSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired sessions`);
    }
  }

  private async cleanupOldLogs() {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30');
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old audit logs`);
    }
  }

  private async cleanupOldMonitoringData() {
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '90');
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await prisma.deviceMonitoring.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old monitoring data`);
    }
  }

  private async cleanupExpiredDevices() {
    const result = await prisma.device.updateMany({
      where: {
        deletedAt: { lt: new Date() },
        status: 'deleted',
      },
      data: {
        status: 'deleted',
      },
    });
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired devices`);
    }
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}

export const cleanupJob = new CleanupJob();
