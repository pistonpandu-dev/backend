import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import { redisAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from './redis';
import { logger } from './logger';

export const createSocketServer = (server: Server): SocketServer => {
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.SOCKET_CORS?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup Redis adapter for scaling
  try {
    const redis = getRedisClient();
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    
    io.adapter(redisAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter configured');
  } catch (error) {
    logger.warn('Redis adapter not configured, using in-memory adapter');
  }

  return io;
};
