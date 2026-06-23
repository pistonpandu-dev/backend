export const ERROR_CODES = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_TOKEN_INVALID: 'AUTH_003',
  AUTH_TOKEN_MISSING: 'AUTH_004',
  AUTH_ACCOUNT_DISABLED: 'AUTH_005',
  AUTH_ACCOUNT_LOCKED: 'AUTH_006',
  AUTH_PASSWORD_WEAK: 'AUTH_007',
  AUTH_EMAIL_EXISTS: 'AUTH_008',
  
  // Device errors
  DEVICE_NOT_FOUND: 'DEV_001',
  DEVICE_ALREADY_EXISTS: 'DEV_002',
  DEVICE_VERIFICATION_FAILED: 'DEV_003',
  DEVICE_OFFLINE: 'DEV_004',
  
  // File errors
  FILE_UPLOAD_FAILED: 'FILE_001',
  FILE_NOT_FOUND: 'FILE_002',
  FILE_INVALID_TYPE: 'FILE_003',
  FILE_SIZE_EXCEEDED: 'FILE_004',
  
  // Database errors
  DB_CONNECTION_FAILED: 'DB_001',
  DB_QUERY_FAILED: 'DB_002',
  DB_UNIQUE_CONSTRAINT: 'DB_003',
  
  // Validation errors
  VALIDATION_FAILED: 'VAL_001',
  INVALID_INPUT: 'VAL_002',
  
  // General errors
  INTERNAL_ERROR: 'GEN_001',
  NOT_FOUND: 'GEN_002',
  UNAUTHORIZED: 'GEN_003',
  FORBIDDEN: 'GEN_004',
  RATE_LIMIT_EXCEEDED: 'GEN_005',
};

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please login again',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'Invalid authentication token',
  [ERROR_CODES.AUTH_TOKEN_MISSING]: 'Authentication token is required',
  [ERROR_CODES.AUTH_ACCOUNT_DISABLED]: 'Your account has been disabled',
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 'Your account has been locked',
  [ERROR_CODES.AUTH_PASSWORD_WEAK]: 'Password does not meet security requirements',
  [ERROR_CODES.AUTH_EMAIL_EXISTS]: 'Email already registered',
  [ERROR_CODES.DEVICE_NOT_FOUND]: 'Device not found',
  [ERROR_CODES.DEVICE_ALREADY_EXISTS]: 'Device already exists',
  [ERROR_CODES.DEVICE_VERIFICATION_FAILED]: 'Device verification failed',
  [ERROR_CODES.FILE_UPLOAD_FAILED]: 'File upload failed',
  [ERROR_CODES.FILE_NOT_FOUND]: 'File not found',
  [ERROR_CODES.FILE_INVALID_TYPE]: 'Invalid file type',
  [ERROR_CODES.FILE_SIZE_EXCEEDED]: 'File size exceeds limit',
  [ERROR_CODES.VALIDATION_FAILED]: 'Validation failed',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
};
