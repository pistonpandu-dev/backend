import { Request, Response, NextFunction } from 'express';

const rolePermissions = {
  super_admin: ['*'],
  admin: [
    'device.read', 'device.write', 'device.delete',
    'location.read', 'location.write',
    'session.read', 'session.write',
    'file.read', 'file.write',
    'dashboard.read',
    'security.read',
    'audit.read',
  ],
  operator: [
    'device.read', 'device.write',
    'location.read',
    'session.read',
    'file.read',
    'dashboard.read',
  ],
  viewer: [
    'device.read',
    'location.read',
    'dashboard.read',
  ],
};

export const checkPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const permissions = rolePermissions[userRole as keyof typeof rolePermissions];

    if (!permissions || (!permissions.includes('*') && !permissions.includes(permission))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
    }

    next();
  };
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Required role not found',
      });
    }

    next();
  };
};
