import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { NotificationService } from '../../services/notification.service';

export class LocationService {
  private static instance: LocationService;
  private auditService: SecurityAuditService;
  private notificationService: NotificationService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async updateLocation(deviceId: string, data: any) {
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const location = await prisma.location.create({
      data: {
        deviceId: device.id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        speed: data.speed,
        address: data.address,
      },
    });

    // Update Redis cache for live location
    const redis = getRedisClient();
    await redis.setEx(
      `live_location:${deviceId}`,
      60,
      JSON.stringify({
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        speed: data.speed,
        address: data.address,
        timestamp: new Date().toISOString(),
      })
    );

    // Update device last seen
    await deviceRepository.updateStatus(device.id, 'online');

    await this.auditService.logSecurityEvent({
      action: 'location_updated',
      module: 'locations',
      level: 'info',
      description: `Location updated for device ${deviceId}`,
      metadata: { deviceId, latitude: data.latitude, longitude: data.longitude },
    });

    return location;
  }

  async getLiveLocation(deviceId: string) {
    const redis = getRedisClient();
    const cached = await redis.get(`live_location:${deviceId}`);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const location = await prisma.location.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!location) {
      throw new Error('No location data found');
    }

    return location;
  }

  async getLocationHistory(deviceId: string, query: any) {
    const { startDate, endDate, limit = 100, offset = 0 } = query;

    const where: any = { deviceId };

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const [data, total] = await Promise.all([
      prisma.location.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.location.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async findDevice(data: any) {
    const { deviceId, latitude, longitude, radius = 1000 } = data;

    // Find device by ID
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Get last known location
    const location = await prisma.location.findFirst({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!location) {
      throw new Error('Device has no location data');
    }

    // Calculate distance (simplified)
    const distance = this.calculateDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    );

    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      location,
      distance,
      lastSeen: device.lastSeen,
    };
  }

  async enableLostMode(deviceId: string, data: any) {
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    await deviceRepository.update(device.id, {
      isCompromised: true,
      compromisedAt: new Date(),
    });

    // Send notification
    await this.notificationService.sendNotification({
      title: 'Lost Mode Enabled',
      message: `Device ${device.deviceName} has entered lost mode`,
      type: 'lost_mode',
      deviceId,
      sendFCM: true,
      metadata: { message: data.message, contact: data.contact },
    });

    await this.auditService.logSecurityEvent({
      action: 'lost_mode_enabled',
      module: 'locations',
      level: 'high',
      description: `Lost mode enabled for device ${deviceId}`,
      metadata: { deviceId, message: data.message },
    });

    return { success: true };
  }

  async disableLostMode(deviceId: string) {
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    await deviceRepository.update(device.id, {
      isCompromised: false,
      compromisedAt: null,
    });

    await this.auditService.logSecurityEvent({
      action: 'lost_mode_disabled',
      module: 'locations',
      level: 'info',
      description: `Lost mode disabled for device ${deviceId}`,
      metadata: { deviceId },
    });

    return { success: true };
  }

  async getLocationStats(deviceId: string) {
    const stats = await prisma.$transaction([
      prisma.location.count({
        where: { deviceId },
      }),
      prisma.location.groupBy({
        by: ['createdAt'],
        where: { deviceId },
        _count: true,
        orderBy: { createdAt: 'desc' },
        take: 24,
      }),
    ]);

    return {
      totalLocations: stats[0],
      recentLocations: stats[1],
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}
