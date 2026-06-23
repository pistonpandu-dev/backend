import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';

interface JwtPayload {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        role: string;
        email?: string;
        name?: string;
      };
      sessionId: string;
      token: string;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;

    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Token has been revoked',
        },
      });
    }

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
            name: true,
            email: true,
            role: true,
            isActive: true,
            lockedUntil: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
      });
    }

    const admin = session.admin;
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Account disabled or not found',
        },
      });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account locked until ${admin.lockedUntil.toISOString()}`,
        },
      });
    }

    req.user = {
      id: admin.id,
      role: admin.role,
      email: admin.email,
      name: admin.name,
    };
    req.sessionId = session.id;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expired',
        },
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Internal server error',
      },
    });
  }
};
