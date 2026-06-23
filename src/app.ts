import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer, Server } from 'http';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Config
import { logger } from './config/logger';
import { connectRedis, getRedisClient } from './config/redis';
import { initFirebase } from './config/firebase';
import { setupSocketIO } from './socket';

// Middlewares
import { errorHandler } from './middlewares/error.middleware';
import { rateLimiter } from './middlewares/rate-limit.middleware';
import { authMiddleware } from './middlewares/auth.middleware';
import { securityMiddleware } from './middlewares/security.middleware';
import { AntiFakeDataMiddleware } from './middlewares/anti-fake-data.middleware';

// Routes
import { apiRoutes } from './routes/api.routes';
import { healthRoutes } from './routes/health.routes';
import { webhookRoutes } from './routes/webhook.routes';

// Services
import { initializeJobs } from './jobs';

export class App {
  private app: Express;
  private server: Server;
  private io: SocketServer;
  private prisma: PrismaClient;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.prisma = new PrismaClient();
    this.io = new SocketServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddlewares();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    // Security
    if (process.env.NODE_ENV === 'production') {
      this.app.use(helmet({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        frameguard: { action: 'deny' },
        xssFilter: true,
        noSniff: true,
        hidePoweredBy: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      }));
    }

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Timestamp', 'X-Request-Signature'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    }));

    // Compression
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }));

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Security middleware
    this.app.use(securityMiddleware);

    // Anti-fake data middleware
    const antiFakeMiddleware = AntiFakeDataMiddleware.getInstance();
    this.app.use(antiFakeMiddleware.validateRequestData);

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path}`, {
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          contentLength: res.get('content-length'),
        });
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.use('/health', healthRoutes);

    // Webhook routes (no auth)
    this.app.use('/webhooks', webhookRoutes);

    // API routes
    this.app.use('/api', apiRoutes);

    // Static files
    this.app.use('/uploads', express.static(process.env.UPLOAD_PATH || 'uploads'));

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          path: req.path,
        },
      });
    });
  }

  private setupSocketIO(): void {
    setupSocketIO(this.io);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('✅ Database connected successfully');

      await connectRedis();
      logger.info('✅ Redis connected successfully');

      initFirebase();
      logger.info('✅ Firebase initialized successfully');

      await initializeJobs();
      logger.info('✅ Background jobs initialized successfully');

      this.setupCleanupIntervals();

      logger.info('🚀 Application initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  private setupCleanupIntervals(): void {
    setInterval(async () => {
      try {
        const result = await this.prisma.adminSession.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
          },
        });
        if (result.count > 0) {
          logger.info(`Cleaned up ${result.count} expired sessions`);
        }
      } catch (error) {
        logger.error('Failed to cleanup expired sessions:', error);
      }
    }, 60 * 60 * 1000);

    setInterval(async () => {
      try {
        const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30');
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        
        const result = await this.prisma.auditLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
          },
        });
        if (result.count > 0) {
          logger.info(`Cleaned up ${result.count} old audit logs`);
        }
      } catch (error) {
        logger.error('Failed to cleanup old logs:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('🛑 Shutting down gracefully...');

    try {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
      logger.info('✅ HTTP server closed');

      await this.io.close();
      logger.info('✅ Socket.IO closed');

      await this.prisma.$disconnect();
      logger.info('✅ Database disconnected');

      const redis = getRedisClient();
      await redis.quit();
      logger.info('✅ Redis disconnected');

      logger.info('✅ Graceful shutdown completed');
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
    }
  }

  getServer(): Server {
    return this.server;
  }

  getApp(): Express {
    return this.app;
  }

  getIO(): SocketServer {
    return this.io;
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }
}
