import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { DeviceVerificationService } from './device-verification.service';
import { SecurityUtil } from '../../utils/security.util';
import { getRedisClient } from '../../config/redis';

export class DeviceController {
  private deviceVerification: DeviceVerificationService;
  private securityUtil: SecurityUtil;

  constructor() {
    this.deviceVerification = DeviceVerificationService.getInstance();
    this.securityUtil = SecurityUtil.getInstance();
  }

  // Register device with enhanced verification
  registerDevice = async (req: Request, res: Response) => {
    try {
      const deviceData = req.body;
      const redis = getRedisClient();

      // Check if device already exists
      const existingDevice = await prisma.device.findUnique({
        where: { deviceId: deviceData.deviceId },
      });

      if (existingDevice) {
        return res.status(409).json({
          success: false,
          message: 'Device already registered',
          code: 'DEVICE_EXISTS',
        });
      }

      // Enhanced verification
      const verification = await this.deviceVerification.verifyDevice(deviceData);

      if (!verification.verified) {
        logger.warn('Device registration failed verification', {
          deviceId: deviceData.deviceId,
          score: verification.score,
          reasons: verification.reasons,
        });

        return res.status(403).json({
          success: false,
          message: 'Device verification failed',
          code: 'VERIFICATION_FAILED',
          reasons: verification.reasons,
        });
      }

      // Generate device signature
      const deviceSignature = this.securityUtil.generateDeviceFingerprint(deviceData);

      // Create device with security metadata
      const device = await prisma.device.create({
        data: {
          deviceId: deviceData.deviceId,
          deviceName: deviceData.deviceName,
          brand: deviceData.brand,
          model: deviceData.model,
          androidVersion: deviceData.androidVersion,
          sdkVersion: deviceData.sdkVersion,
          serialNumber: deviceData.serialNumber,
          screenResolution: deviceData.screenResolution,
          batteryHealth: deviceData.batteryHealth,
          totalStorage: BigInt(deviceData.totalStorage || 0),
          freeStorage: BigInt(deviceData.freeStorage || 0),
          ramTotal: BigInt(deviceData.ramTotal || 0),
          ramFree: BigInt(deviceData.ramFree || 0),
          cpuInfo: deviceData.cpuInfo,
          networkInfo: deviceData.networkInfo,
          status: 'online',
          lastSeen: new Date(),
        },
      });

      // Store device fingerprint
      await redis.setEx(
        `device_fingerprint:${deviceData.deviceId}`,
        86400,
        deviceSignature
      );

      // Log registration
      logger.info('Device registered successfully', {
        deviceId: deviceData.deviceId,
        score: verification.score,
      });

      res.status(201).json({
        success: true,
        data: device,
        message: 'Device registered successfully',
        verificationScore: verification.score,
      });
    } catch (error) {
      logger.error('Register device error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register device',
        code: 'REGISTRATION_FAILED',
      });
    }
  };

  // Update device information with validation
  updateDevice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const redis = getRedisClient();

      // Check if device exists
      const existingDevice = await prisma.device.findUnique({
        where: { id },
      });

      if (!existingDevice) {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      // Validate update data
      if (this.securityUtil.detectSuspiciousPattern(updateData)) {
        logger.warn('Suspicious update data detected', {
          deviceId: existingDevice.deviceId,
          updateData: JSON.stringify(updateData).slice(0, 200),
        });

        return res.status(403).json({
          success: false,
          message: 'Suspicious update data detected',
          code: 'SUSPICIOUS_DATA',
        });
      }

      // Check for impossible value changes
      if (updateData.totalStorage && existingDevice.totalStorage) {
        const storageDiff = BigInt(updateData.totalStorage) - existingDevice.totalStorage;
        if (storageDiff < 0) {
          // Storage can't decrease
          logger.warn('Impossible storage change detected', {
            deviceId: existingDevice.deviceId,
            oldStorage: existingDevice.totalStorage.toString(),
            newStorage: updateData.totalStorage,
          });

          return res.status(403).json({
            success: false,
            message: 'Impossible storage change detected',
            code: 'IMPOSSIBLE_STORAGE_CHANGE',
          });
        }
      }

      // Check for suspicious serial number changes
      if (updateData.serialNumber && updateData.serialNumber !== existingDevice.serialNumber) {
        // Only allow serial number change if device is re-enrolling
        const isReEnrolling = await this.isDeviceReEnrolling(existingDevice.deviceId);
        if (!isReEnrolling) {
          logger.warn('Suspicious serial number change', {
            deviceId: existingDevice.deviceId,
            oldSerial: existingDevice.serialNumber,
            newSerial: updateData.serialNumber,
          });

          return res.status(403).json({
            success: false,
            message: 'Serial number change not allowed',
            code: 'SERIAL_CHANGE_NOT_ALLOWED',
          });
        }
      }

      // Update device
      const updatedDevice = await prisma.device.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      // Update fingerprint if needed
      if (updateData.androidVersion || updateData.sdkVersion || updateData.screenResolution) {
        const newFingerprint = this.securityUtil.generateDeviceFingerprint({
          deviceId: existingDevice.deviceId,
          androidVersion: updateData.androidVersion || existingDevice.androidVersion,
          sdkVersion: updateData.sdkVersion || existingDevice.sdkVersion,
          serialNumber: updateData.serialNumber || existingDevice.serialNumber,
          screenResolution: updateData.screenResolution || existingDevice.screenResolution,
        });

        await redis.setEx(
          `device_fingerprint:${existingDevice.deviceId}`,
          86400,
          newFingerprint
        );
      }

      logger.info('Device updated successfully', {
        deviceId: existingDevice.deviceId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        success: true,
        data: updatedDevice,
        message: 'Device updated successfully',
      });
    } catch (error) {
      logger.error('Update device error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update device',
        code: 'UPDATE_FAILED',
      });
    }
  };

  // Get device with verification status
  getDevice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const device = await prisma.device.findUnique({
        where: { id },
        include: {
          monitoring: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          locations: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          enrollments: true,
          groupMembers: {
            include: {
              group: true,
            },
          },
          tagMembers: {
            include: {
              tag: true,
            },
          },
        },
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      // Calculate device trust score
      const trustScore = await this.calculateDeviceTrustScore(device);

      res.json({
        success: true,
        data: {
          ...device,
          trustScore,
        },
      });
    } catch (error) {
      logger.error('Get device error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get device',
        code: 'GET_DEVICE_FAILED',
      });
    }
  };

  // Calculate device trust score
  private async calculateDeviceTrustScore(device: any): Promise<number> {
    let score = 100;
    const redis = getRedisClient();

    // Check device age
    const deviceAge = Date.now() - new Date(device.createdAt).getTime();
    const deviceAgeDays = deviceAge / (1000 * 60 * 60 * 24);
    
    if (deviceAgeDays < 1) {
      score -= 20; // New device
    }

    // Check data consistency
    const monitoringCount = await prisma.deviceMonitoring.count({
      where: { deviceId: device.id },
    });

    if (monitoringCount < 10) {
      score -= 15; // Not enough data
    }

    // Check for suspicious activity
    const securityAlerts = await prisma.securityAlert.count({
      where: {
        deviceId: device.id,
        level: { in: ['high', 'critical'] },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    if (securityAlerts > 0) {
      score -= securityAlerts * 10;
    }

    // Check data gaps
    const gaps = await this.detectDataGaps(device.id);
    if (gaps > 3) {
      score -= gaps * 5;
    }

    // Check if device is in whitelist
    const isWhitelisted = await redis.get(`whitelist:${device.deviceId}`);
    if (isWhitelisted) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async detectDataGaps(deviceId: string): Promise<number> {
    const monitoringData = await prisma.deviceMonitoring.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    let gaps = 0;
    const GAP_THRESHOLD = 4 * 60 * 60 * 1000; // 4 hours

    for (let i = 1; i < monitoringData.length; i++) {
      const timeDiff = new Date(monitoringData[i].createdAt).getTime() - 
                       new Date(monitoringData[i - 1].createdAt).getTime();
      
      if (timeDiff > GAP_THRESHOLD) {
        gaps++;
      }
    }

    return gaps;
  }

  private async isDeviceReEnrolling(deviceId: string): Promise<boolean> {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        deviceId,
        status: 'approved',
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    return enrollments.length >= 2;
  }

  // Delete device with security checks
  deleteDevice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const device = await prisma.device.findUnique({
        where: { id },
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      // Check if deletion is allowed
      const canDelete = await this.canDeleteDevice(device);
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'Device deletion not allowed at this time',
          code: 'DELETION_NOT_ALLOWED',
        });
      }

      // Soft delete (mark as inactive)
      await prisma.device.update({
        where: { id },
        data: {
          status: 'offline',
          updatedAt: new Date(),
        },
      });

      // Actually delete after 30 days (cron job)
      await prisma.$executeRaw`
        UPDATE devices 
        SET deleted_at = NOW() + INTERVAL '30 days'
        WHERE id = ${id}
      `;

      logger.info('Device marked for deletion', {
        deviceId: device.deviceId,
        scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      res.json({
        success: true,
        message: 'Device scheduled for deletion',
        scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      logger.error('Delete device error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete device',
        code: 'DELETE_FAILED',
      });
    }
  };

  private async canDeleteDevice(device: any): Promise<boolean> {
    // Check if device has been active recently
    const lastSeen = new Date(device.lastSeen || device.createdAt);
    const daysSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    
    // Can't delete devices that were active in the last 7 days
    if (daysSinceLastSeen < 7) {
      return false;
    }

    // Check if device has pending enrollments
    const pendingEnrollments = await prisma.enrollment.count({
      where: {
        deviceId: device.id,
        status: 'pending',
      },
    });

    if (pendingEnrollments > 0) {
      return false;
    }

    return true;
  }
}
