import { Prisma } from '@prisma/client';
import { deviceRepository } from './device.repository';
import { DeviceVerificationService } from './device-verification.service';
import { SecurityAuditService } from '../security/audit.service';
import { NotificationService } from '../../services/notification.service';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

export class DeviceService {
  private static instance: DeviceService;
  private verificationService: DeviceVerificationService;
  private auditService: SecurityAuditService;
  private notificationService: NotificationService;

  private constructor() {
    this.verificationService = DeviceVerificationService.getInstance();
    this.auditService = SecurityAuditService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  async getAllDevices(query: any) {
    return await deviceRepository.findAll(query);
  }

  async getDeviceById(id: string) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new Error('Device not found');
    }
    return device;
  }

  async getDeviceByDeviceId(deviceId: string) {
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    return device;
  }

  async registerDevice(data: any) {
    // Check if device already exists
    const existing = await deviceRepository.findByDeviceId(data.deviceId);
    if (existing) {
      throw new Error('Device already registered');
    }

    const device = await deviceRepository.create({
      ...data,
      status: 'online',
      lastSeen: new Date(),
      trustScore: 100,
      verificationLevel: 'basic',
    });

    await this.auditService.logSecurityEvent({
      action: 'device_registered',
      module: 'devices',
      level: 'info',
      description: `Device ${data.deviceId} registered`,
      metadata: { deviceId: data.deviceId },
    });

    return device;
  }

  async updateDevice(id: string, data: any) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new Error('Device not found');
    }

    const updated = await deviceRepository.update(id, data);

    await this.auditService.logSecurityEvent({
      action: 'device_updated',
      module: 'devices',
      level: 'info',
      description: `Device ${device.deviceId} updated`,
      metadata: { deviceId: device.deviceId, updatedFields: Object.keys(data) },
    });

    return updated;
  }

  async updateDeviceInfo(data: any) {
    const { deviceId } = data;
    
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const updated = await deviceRepository.update(device.id, {
      ...data,
      lastSeen: new Date(),
      status: 'online',
    });

    // Update Redis cache
    const redis = getRedisClient();
    await redis.setEx(`device:${deviceId}`, 300, JSON.stringify(updated));

    return updated;
  }

  async deleteDevice(id: string) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new Error('Device not found');
    }

    await deviceRepository.delete(id);

    await this.auditService.logSecurityEvent({
      action: 'device_deleted',
      module: 'devices',
      level: 'high',
      description: `Device ${device.deviceId} deleted`,
      metadata: { deviceId: device.deviceId },
    });

    // Clear Redis cache
    const redis = getRedisClient();
    await redis.del(`device:${device.deviceId}`);
    await redis.del(`device_fingerprint:${device.deviceId}`);
  }

  async getDeviceStatus(deviceId: string) {
    const device = await this.getDeviceByDeviceId(deviceId);
    
    // Get latest monitoring data
    const monitoring = await deviceRepository.getLatestMonitoring(device.id);
    
    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      status: device.status,
      lastSeen: device.lastSeen,
      trustScore: device.trustScore,
      verificationLevel: device.verificationLevel,
      isCompromised: device.isCompromised,
      monitoring: monitoring || null,
    };
  }

  async updateDeviceStatus(deviceId: string, status: string) {
    const device = await this.getDeviceByDeviceId(deviceId);
    const updated = await deviceRepository.updateStatus(device.id, status);

    // Send notification
    if (status === 'online') {
      await this.notificationService.sendDeviceOnlineNotification(deviceId, device.deviceName);
    } else if (status === 'offline') {
      await this.notificationService.sendDeviceOfflineNotification(deviceId, device.deviceName);
    }

    return updated;
  }

  async updateTrustScore(deviceId: string, score: number) {
    const device = await this.getDeviceByDeviceId(deviceId);
    const updated = await deviceRepository.updateTrustScore(device.id, score);

    await this.auditService.logSecurityEvent({
      action: 'trust_score_updated',
      module: 'devices',
      level: 'info',
      description: `Device ${deviceId} trust score updated to ${score}`,
      metadata: { deviceId, score },
    });

    return updated;
  }

  async getDeviceStats() {
    return await deviceRepository.getStatistics();
  }

  async searchDevices(searchTerm: string) {
    return await deviceRepository.findAll({
      search: searchTerm,
      limit: 20,
    });
  }
}
