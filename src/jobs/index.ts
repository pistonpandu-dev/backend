import { logger } from '../config/logger';
import { cleanupJob } from './cleanup.job';
import { monitoringJob } from './monitoring.job';
import { notificationJob } from './notification.job';
import { backupJob } from './backup.job';

export const initializeJobs = async () => {
  try {
    await cleanupJob.start();
    logger.info('✅ Cleanup job started');

    await monitoringJob.start();
    logger.info('✅ Monitoring job started');

    await notificationJob.start();
    logger.info('✅ Notification job started');

    if (process.env.BACKUP_ENABLED === 'true') {
      await backupJob.start();
      logger.info('✅ Backup job started');
    }

    logger.info('✅ All background jobs initialized');
  } catch (error) {
    logger.error('Failed to initialize jobs:', error);
    throw error;
  }
};
