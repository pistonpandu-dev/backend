import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { authMiddleware } from './middleware';
import { DeviceHandler } from './handlers/device.handler';
import { MonitoringHandler } from './handlers/monitoring.handler';
import { NotificationHandler } from './handlers/notification.handler';
import { LocationHandler } from './handlers/location.handler';
import { SessionHandler } from './handlers/session.handler';

export const setupSocketIO = (io: SocketServer) => {
  io.use(authMiddleware);

  const dashboardNamespace = io.of('/dashboard');
  const devicesNamespace = io.of('/devices');
  const monitoringNamespace = io.of('/monitoring');
  const locationNamespace = io.of('/location');
  const sessionNamespace = io.of('/session');
  const notificationsNamespace = io.of('/notifications');

  setupDeviceHandlers(devicesNamespace);
  setupMonitoringHandlers(monitoringNamespace);
  setupNotificationHandlers(notificationsNamespace);
  setupLocationHandlers(locationNamespace);
  setupSessionHandlers(sessionNamespace);

  dashboardNamespace.on('connection', (socket) => {
    logger.info(`Dashboard socket connected: ${socket.id}`);
    
    const adminId = socket.data.user.id;
    socket.join(`admin:${adminId}`);

    socket.on('disconnect', () => {
      logger.info(`Dashboard socket disconnected: ${socket.id}`);
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

const setupLocationHandlers = (namespace: any) => {
  namespace.on('connection', (socket: Socket) => {
    const handler = new LocationHandler(socket);
    handler.registerHandlers();
  });
};

const setupSessionHandlers = (namespace: any) => {
  namespace.on('connection', (socket: Socket) => {
    const handler = new SessionHandler(socket);
    handler.registerHandlers();
  });
};
