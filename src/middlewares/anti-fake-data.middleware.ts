import { Request, Response, NextFunction } from 'express';
import { SecurityUtil } from '../utils/security.util';
import { DeviceVerificationService } from '../modules/devices/device-verification.service';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

export class AntiFakeDataMiddleware {
  private static instance: AntiFakeDataMiddleware;
  private securityUtil: SecurityUtil;
  private deviceVerification: DeviceVerificationService;

  private constructor() {
    this.securityUtil = SecurityUtil.getInstance();
    this.deviceVerification = DeviceVerificationService.getInstance();
  }

  static getInstance(): AntiFakeDataMiddleware {
    if (!AntiFakeDataMiddleware.instance) {
      AntiFakeDataMiddleware.instance = new AntiFakeDataMiddleware();
    }
    return AntiFakeDataMiddleware.instance;
  }

  // Validate incoming request data
  validateRequestData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const redis = getRedisClient();

      // Check 1: Validate request signature
      const signature = req.headers['x-request-signature'] as string;
      if (signature) {
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret';
        const isValid = this.securityUtil.validateRequestSignature(
          signature,
          data,
          secret
        );
        
        if (!isValid) {
          logger.warn('Invalid request signature', { 
            ip: req.ip,
            path: req.path 
          });
          return res.status(401).json({
            success: false,
            message: 'Invalid request signature',
            code: 'INVALID_SIGNATURE',
          });
        }
      }

      // Check 2: Validate timestamp
      const timestamp = parseInt(req.headers['x-timestamp'] as string);
      if (timestamp && !this.securityUtil.validateTimestamp(timestamp)) {
        logger.warn('Request timestamp expired', {
          ip: req.ip,
          path: req.path,
          timestamp,
        });
        return res.status(401).json({
          success: false,
          message: 'Request timestamp expired',
          code: 'TIMESTAMP_EXPIRED',
        });
      }

      // Check 3: Check for fake/test data patterns
      if (this.securityUtil.detectSuspiciousPattern(data)) {
        logger.warn('Suspicious data pattern detected', {
          ip: req.ip,
          path: req.path,
          data: JSON.stringify(data).slice(0, 200),
        });
        
        // Block IP for suspicious activity
        await this.blockIP(req.ip);
        
        return res.status(403).json({
          success: false,
          message: 'Suspicious data pattern detected',
          code: 'SUSPICIOUS_DATA',
        });
      }

      // Check 4: Rate limiting for data submission
      const key = `rate_limit:${req.ip}:${req.path}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 60);
      }
      
      if (count > 10) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          count,
        });
        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }

      // Check 5: Validate IP
      if (!this.securityUtil.validateIPAddress(req.ip)) {
        logger.warn('Invalid IP address', {
          ip: req.ip,
          path: req.path,
        });
        return res.status(403).json({
          success: false,
          message: 'Invalid IP address',
          code: 'INVALID_IP',
        });
      }

      // Check 6: Validate email if present
      if (data.email && !this.securityUtil.validateEmailDomain(data.email)) {
        logger.warn('Disposable email detected', {
          ip: req.ip,
          email: data.email,
        });
        return res.status(403).json({
          success: false,
          message: 'Disposable email not allowed',
          code: 'DISPOSABLE_EMAIL',
        });
      }

      // Check 7: Device-specific validation
      if (data.deviceId) {
        const verification = await this.deviceVerification.verifyDevice(data);
        
        if (!verification.verified) {
          logger.warn('Device verification failed', {
            deviceId: data.deviceId,
            score: verification.score,
            reasons: verification.reasons,
          });
          
          return res.status(403).json({
            success: false,
            message: 'Device verification failed',
            code: 'DEVICE_VERIFICATION_FAILED',
            reasons: verification.reasons,
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Anti-fake data middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  // Block IP address
  private async blockIP(ip: string): Promise<void> {
    const redis = getRedisClient();
    await redis.setEx(`blocked_ip:${ip}`, 3600, 'true');
    logger.warn('IP blocked', { ip });
  }

  // Check if IP is blocked
  async isIPBlocked(ip: string): Promise<boolean> {
    const redis = getRedisClient();
    const blocked = await redis.get(`blocked_ip:${ip}`);
    return blocked === 'true';
  }

  // Validate device information
  validateDeviceInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deviceId, deviceName, brand, model } = req.body;

      // Check for fake device IDs
      const fakeDevicePatterns = [
        /^test_/i,
        /^demo_/i,
        /^fake_/i,
        /^mock_/i,
        /^sample_/i,
        /^emulator/i,
        /^simulator/i,
        /^virtual/i,
        /^genymotion/i,
        /^android emulator/i,
      ];

      if (fakeDevicePatterns.some(pattern => pattern.test(deviceId) || pattern.test(deviceName))) {
        logger.warn('Fake device detected', {
          deviceId,
          deviceName,
          ip: req.ip,
        });
        
        await this.blockIP(req.ip);
        
        return res.status(403).json({
          success: false,
          message: 'Fake device detected',
          code: 'FAKE_DEVICE',
        });
      }

      // Check for invalid model/brand combinations
      const validBrands = ['Samsung', 'Apple', 'Google', 'OnePlus', 'Xiaomi', 'Huawei', 'LG', 'Sony', 'Nokia'];
      if (brand && !validBrands.some(b => brand.includes(b))) {
        logger.warn('Invalid brand detected', {
          deviceId,
          brand,
          ip: req.ip,
        });
        
        return res.status(403).json({
          success: false,
          message: 'Invalid brand',
          code: 'INVALID_BRAND',
        });
      }

      // Check for impossible Android version
      if (req.body.androidVersion) {
        const version = parseFloat(req.body.androidVersion);
        if (version < 5 || version > 15) {
          logger.warn('Invalid Android version', {
            deviceId,
            androidVersion: req.body.androidVersion,
            ip: req.ip,
          });
          
          return res.status(403).json({
            success: false,
            message: 'Invalid Android version',
            code: 'INVALID_ANDROID_VERSION',
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Validate device info error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}
