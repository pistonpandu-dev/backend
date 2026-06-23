export const MESSAGES = {
  // Auth messages
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGIN_FAILED: 'Invalid credentials',
    LOGOUT_SUCCESS: 'Logged out successfully',
    REGISTER_SUCCESS: 'Registration successful',
    REGISTER_FAILED: 'Registration failed',
    TOKEN_REFRESHED: 'Token refreshed successfully',
    TOKEN_INVALID: 'Invalid token',
    TOKEN_EXPIRED: 'Token expired',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_RESET_SENT: 'Password reset link sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
    ACCOUNT_DISABLED: 'Account is disabled',
    ACCOUNT_LOCKED: 'Account is locked',
  },
  
  // Device messages
  DEVICE: {
    CREATED: 'Device created successfully',
    UPDATED: 'Device updated successfully',
    DELETED: 'Device deleted successfully',
    NOT_FOUND: 'Device not found',
    ALREADY_EXISTS: 'Device already exists',
    OFFLINE: 'Device is offline',
    ONLINE: 'Device is online',
    VERIFICATION_FAILED: 'Device verification failed',
  },
  
  // Monitoring messages
  MONITORING: {
    DATA_SAVED: 'Monitoring data saved',
    ANOMALY_DETECTED: 'Anomaly detected',
    DATA_NOT_FOUND: 'Monitoring data not found',
  },
  
  // Location messages
  LOCATION: {
    UPDATED: 'Location updated',
    NOT_FOUND: 'Location not found',
    GEOCODE_FAILED: 'Geocoding failed',
  },
  
  // File messages
  FILE: {
    UPLOAD_SUCCESS: 'File uploaded successfully',
    UPLOAD_FAILED: 'File upload failed',
    NOT_FOUND: 'File not found',
    DELETED: 'File deleted successfully',
    INVALID_TYPE: 'Invalid file type',
    SIZE_EXCEEDED: 'File size exceeded',
  },
  
  // Common messages
  COMMON: {
    SUCCESS: 'Operation successful',
    FAILED: 'Operation failed',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_ERROR: 'Internal server error',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    INVALID_INPUT: 'Invalid input',
  },
};
