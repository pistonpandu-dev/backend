import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { authMiddleware } from './middleware';
import { DeviceHandler } from './handlers/device.handler';
import { MonitoringHandler } from './handlers/monitoring.handler';
import { NotificationHandler } from './handlers/notification.handler';

export const setupSocketHandlers = (io: SocketServer) => {
  // Apply authentication middleware
  io.use(authMiddleware);

  // Namespaces
  const dashboardNamespace = io.of('/dashboard');
  const devicesNamespace = io.of('/devices');
  const monitoringNamespace = io.of('/monitoring');
  const locationNamespace = io.of('/location');
  const sessionNamespace = io.of('/session');
  const notificationsNamespace = io.of('/notifications');

  // Setup handlers for each namespace
  setupDeviceHandlers(devicesNamespace);
  setupMonitoringHandlers(monitoringNamespace);
  setupNotificationHandlers(notificationsNamespace);

  // Dashboard namespace - only for admin
  dashboardNamespace.on('connection', (socket) => {
    logger.info(`Dashboard socket connected: ${socket.id}`);
    
    // Join admin room
    const adminId = socket.data.user.id;
    socket.join(`admin:${adminId}`);

    socket.on('disconnect', () => {
      logger.info(`Dashboard socket disconnected: ${socket.id}`);
    });
  });

  // Session namespace
  sessionNamespace.on('connection', (socket) => {
    logger.info(`Session socket connected: ${socket.id}`);
    
    // Handle session events
    socket.on('session:started', (data) => {
      socket.broadcast.emit('session:started', data);
    });

    socket.on('session:ended', (data) => {
      socket.broadcast.emit('session:ended', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Session socket disconnected: ${socket.id}`);
    });
  });

  // Location namespace
  locationNamespace.on('connection', (socket) => {
    logger.info(`Location socket connected: ${socket.id}`);
    
    socket.on('location:updated', (data) => {
      socket.broadcast.emit('location:updated', data);
    });

    socket.on('geofence:triggered', (data) => {
      socket.broadcast.emit('geofence:triggered', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Location socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO handlers initialized');
};

const setupDeviceHandlers = (namespace: any) => {
  namespace.on('connection', (socket: Socket) => {
    const handler = new DeviceHandler(socket);
    handler.registerHandlers();
  });
};

const setupMonitoringHandlers = (namespace: any) => {
  namespace.on('connection', (socket: Socket) => {
    const handler = new MonitoringHandler(socket);
    handler.registerHandlers();
  });
};

const setupNotificationHandlers = (namespace: any) => {
  namespace.on('connection', (socket: Socket) => {
    const handler = new NotificationHandler(socket);
    handler.registerHandlers();
  });
};
