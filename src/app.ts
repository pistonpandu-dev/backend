import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Config
import { logger } from './config/logger';
import { connectRedis } from './config/redis';
import { initFirebase } from './config/firebase';

// Middlewares
import { errorHandler } from './middlewares/error.middleware';
import { rateLimiter } from './middlewares/rate-limit.middleware';
import { authMiddleware } from './middlewares/auth.middleware';

// Routes
import authRoutes from './modules/auth/auth.routes';
import deviceRoutes from './modules/devices/device.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import locationRoutes from './modules/locations/location.routes';
import geofenceRoutes from './modules/geofence/geofence.routes';
import applicationRoutes from './modules/applications/application.routes';
import sessionRoutes from './modules/remote-session/session.routes';
import screenRoutes from './modules/screens/screen.routes';
import fileRoutes from './modules/files/file.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import securityRoutes from './modules/security/security.routes';
import logRoutes from './modules/logs/log.routes';

// Socket
import { setupSocketHandlers } from './socket';

// Services
import { SocketService } from './services/socket.service';

class App {
  public app: Express;
  public httpServer: any;
  public io: SocketServer;
  public prisma: PrismaClient;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
    this.prisma = new PrismaClient();

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketIO();
    this.initializeServices();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security
    if (process.env.NODE_ENV === 'production') {
      this.app.use(helmet({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        frameguard: {
          action: 'deny',
        },
      }));
    }

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/dashboard', authMiddleware, dashboardRoutes);
    this.app.use('/api/devices', authMiddleware, deviceRoutes);
    this.app.use('/api/monitoring', authMiddleware, monitoringRoutes);
    this.app.use('/api/location', authMiddleware, locationRoutes);
    this.app.use('/api/geofence', authMiddleware, geofenceRoutes);
    this.app.use('/api/apps', authMiddleware, applicationRoutes);
    this.app.use('/api/session', authMiddleware, sessionRoutes);
    this.app.use('/api/screen', authMiddleware, screenRoutes);
    this.app.use('/api/files', authMiddleware, fileRoutes);
    this.app.use('/api/notifications', authMiddleware, notificationRoutes);
    this.app.use('/api/security', authMiddleware, securityRoutes);
    this.app.use('/api/logs', authMiddleware, logRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    });
  }

  private initializeSocketIO(): void {
    setupSocketHandlers(this.io);
  }

  private initializeServices(): void {
    // Initialize Socket Service
    SocketService.getInstance(this.io);

    // Initialize Firebase
    initFirebase();

    // Connect Redis
    connectRedis();
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.prisma.$connect();
      logger.info('✅ Database connected successfully');

      // Start server
      const PORT = process.env.PORT || 3000;
      this.httpServer.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
        logger.info(`🔗 API URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
      });
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      await this.httpServer.close();
      logger.info('🛑 Server shut down gracefully');
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Initialize app
const app = new App();
app.start();

// Handle shutdown gracefully
process.on('SIGTERM', () => app.shutdown());
process.on('SIGINT', () => app.shutdown());

export default app;
