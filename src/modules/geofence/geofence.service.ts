import { geofenceRepository } from './geofence.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { NotificationService } from '../../services/notification.service';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

export class GeofenceService {
  private static instance: GeofenceService;
  private auditService: SecurityAuditService;
  private notificationService: NotificationService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  async getAllGeofences(query: any) {
    return await geofenceRepository.findAll(query);
  }

  async getGeofenceById(id: string) {
    const geofence = await geofenceRepository.findById(id);
    if (!geofence) {
      throw new Error('Geofence not found');
    }
    return geofence;
  }

  async createGeofence(data: any) {
    const { deviceId, name, latitude, longitude, radius } = data;

    // Check if device exists
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Check if geofence name already exists for this device
    const existing = await geofenceRepository.findByName(device.id, name);
    if (existing) {
      throw new Error('Geofence with this name already exists for this device');
    }

    const geofence = await geofenceRepository.create({
      deviceId: device.id,
      name,
      latitude,
      longitude,
      radius,
      isActive: true,
    });

    await this.auditService.logSecurityEvent({
      action: 'geofence_created',
      module: 'geofence',
      level: 'info',
      description: `Geofence ${name} created for device ${deviceId}`,
      metadata: { deviceId, name, latitude, longitude, radius },
    });

    return geofence;
  }

  async updateGeofence(id: string, data: any) {
    const geofence = await geofenceRepository.findById(id);
    if (!geofence) {
      throw new Error('Geofence not found');
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== geofence.name) {
      const existing = await geofenceRepository.findByName(geofence.deviceId, data.name);
      if (existing) {
        throw new Error('Geofence with this name already exists for this device');
      }
    }

    const updated = await geofenceRepository.update(id, data);

    await this.auditService.logSecurityEvent({
      action: 'geofence_updated',
      module: 'geofence',
      level: 'info',
      description: `Geofence ${geofence.name} updated`,
      metadata: { id, updatedFields: Object.keys(data) },
    });

    return updated;
  }

  async deleteGeofence(id: string) {
    const geofence = await geofenceRepository.findById(id);
    if (!geofence) {
      throw new Error('Geofence not found');
    }

    await geofenceRepository.delete(id);

    await this.auditService.logSecurityEvent({
      action: 'geofence_deleted',
      module: 'geofence',
      level: 'high',
      description: `Geofence ${geofence.name} deleted`,
      metadata: { id, name: geofence.name },
    });
  }

  async toggleGeofence(id: string, isActive: boolean) {
    const geofence = await geofenceRepository.findById(id);
    if (!geofence) {
      throw new Error('Geofence not found');
    }

    const updated = await geofenceRepository.update(id, { isActive });

    await this.auditService.logSecurityEvent({
      action: isActive ? 'geofence_activated' : 'geofence_deactivated',
      module: 'geofence',
      level: 'info',
      description: `Geofence ${geofence.name} ${isActive ? 'activated' : 'deactivated'}`,
      metadata: { id, name: geofence.name, isActive },
    });

    return updated;
  }

  async getGeofenceLogs(id: string, query: any) {
    const { startDate, endDate, limit = 100, offset = 0 } = query;

    const where: any = { geofenceId: id };

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const [data, total] = await Promise.all([
      geofenceRepository.getLogs(where, limit, offset),
      geofenceRepository.countLogs(where),
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

  async triggerGeofenceEvent(geofenceId: string, data: any) {
    const { deviceId, event, latitude, longitude } = data;

    const geofence = await geofenceRepository.findById(geofenceId);
    if (!geofence) {
      throw new Error('Geofence not found');
    }

    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Check if device is actually inside/outside the geofence
    const distance = this.calculateDistance(
      latitude,
      longitude,
      geofence.latitude,
      geofence.longitude
    );

    const isInside = distance <= geofence.radius;

    // Validate event matches actual location
    if ((event === 'enter' && !isInside) || (event === 'exit' && isInside)) {
      throw new Error('Event does not match device location');
    }

    // Create geofence log
    const log = await geofenceRepository.createLog({
      deviceId: device.id,
      geofenceId,
      event,
      latitude,
      longitude,
    });

    // Send notification
    await this.notificationService.sendNotification({
      title: `Geofence ${event === 'enter' ? 'Entered' : 'Exited'}`,
      message: `Device ${device.deviceName} ${event === 'enter' ? 'entered' : 'exited'} geofence ${geofence.name}`,
      type: 'geofence_alert',
      deviceId,
      sendFCM: true,
      metadata: {
        geofenceId,
        geofenceName: geofence.name,
        event,
        latitude,
        longitude,
        distance,
      },
    });

    // Cache the event
    const redis = getRedisClient();
    await redis.setEx(
      `geofence:${geofenceId}:last_event`,
      3600,
      JSON.stringify({
        deviceId,
        event,
        timestamp: new Date().toISOString(),
      })
    );

    await this.auditService.logSecurityEvent({
      action: `geofence_${event}`,
      module: 'geofence',
      level: 'high',
      description: `Device ${deviceId} ${event}ed geofence ${geofence.name}`,
      metadata: { deviceId, geofenceId, event, latitude, longitude },
    });

    return log;
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
    return R * c * 1000; // Return in meters
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}
