import 'dotenv/config';
import { App } from './app';
import { logger } from './config/logger';

const app = new App();

const startServer = async () => {
  try {
    await app.initialize();
    const port = process.env.PORT || 3000;
    app.getServer().listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API URL: ${process.env.BASE_URL || `http://localhost:${port}`}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Performing graceful shutdown...');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Performing graceful shutdown...');
  await app.shutdown();
  process.exit(0);
});

startServer();
