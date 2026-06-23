import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const authMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

    const session = await prisma.adminSession.findFirst({
      where: {
        adminId: decoded.id,
        accessToken: token,
        expiresAt: { gt: new Date() },
      },
      include: {
        admin: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || !session.admin.isActive) {
      return next(new Error('Invalid or expired session'));
    }

    socket.data.user = {
      id: session.admin.id,
      role: session.admin.role,
    };
    socket.data.sessionId = session.id;

    next();
  } catch (error) {
    logger.error('Socket auth error:', error);
    next(new Error('Authentication failed'));
  }
};
