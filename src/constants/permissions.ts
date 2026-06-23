export const PERMISSIONS = {
  // Device permissions
  DEVICE_READ: 'device.read',
  DEVICE_WRITE: 'device.write',
  DEVICE_DELETE: 'device.delete',
  
  // Location permissions
  LOCATION_READ: 'location.read',
  LOCATION_WRITE: 'location.write',
  
  // Session permissions
  SESSION_READ: 'session.read',
  SESSION_WRITE: 'session.write',
  
  // File permissions
  FILE_READ: 'file.read',
  FILE_WRITE: 'file.write',
  
  // Dashboard permissions
  DASHBOARD_READ: 'dashboard.read',
  
  // Security permissions
  SECURITY_READ: 'security.read',
  SECURITY_WRITE: 'security.write',
  
  // Audit permissions
  AUDIT_READ: 'audit.read',
  
  // Admin permissions
  ADMIN_READ: 'admin.read',
  ADMIN_WRITE: 'admin.write',
  ADMIN_DELETE: 'admin.delete',
  
  // All permissions
  ALL: '*',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [PERMISSIONS.ALL],
  admin: [
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.DEVICE_WRITE,
    PERMISSIONS.DEVICE_DELETE,
    PERMISSIONS.LOCATION_READ,
    PERMISSIONS.LOCATION_WRITE,
    PERMISSIONS.SESSION_READ,
    PERMISSIONS.SESSION_WRITE,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.FILE_WRITE,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.SECURITY_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ADMIN_READ,
  ],
  operator: [
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.DEVICE_WRITE,
    PERMISSIONS.LOCATION_READ,
    PERMISSIONS.SESSION_READ,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.DASHBOARD_READ,
  ],
  viewer: [
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.LOCATION_READ,
    PERMISSIONS.DASHBOARD_READ,
  ],
};
