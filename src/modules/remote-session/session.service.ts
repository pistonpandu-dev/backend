import { sessionRepository } from './session.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { NotificationService } from '../../services/notification.service';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

export class SessionService {
  private static instance: SessionService;
  private auditService: SecurityAuditService;
  private notificationService: NotificationService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  async getAllSessions(query: any) {
    return await sessionRepository.findAll(query);
  }

  async getSessionById(id: string) {
    const session = await sessionRepository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  async requestSession(adminId: string, data: any) {
    const { deviceId } = data;

    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Check if there's already an active session
    const activeSession = await sessionRepository.findActiveByDevice(device.id);
    if (activeSession) {
      throw new Error('Device already has an active session');
    }

    const session = await sessionRepository.create({
      deviceId: device.id,
      adminId,
      status: 'pending',
    });

    // Send notification
    await this.notificationService.sendSessionStartedNotification(deviceId, adminId);

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'session_requested',
      module: 'remote-session',
      level: 'info',
      description: `Session requested for device ${deviceId}`,
      metadata: { deviceId, sessionId: session.id },
    });

    return session;
  }

  async approveSession(id: string) {
    const session = await sessionRepository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'pending') {
      throw new Error(`Session is already ${session.status}`);
    }

    const updated = await sessionRepository.update(id, {
      status: 'approved',
      startedAt: new Date(),
    });

    // Update device status
    await deviceRepository.updateStatus(session.deviceId, 'online');

    // Cache active session
    const redis = getRedisClient();
    await redis.setEx(
      `active_session:${session.deviceId}`,
      3600,
      JSON.stringify(updated)
    );

    await this.auditService.logSecurityEvent({
      adminId: session.adminId,
      action: 'session_approved',
      module: 'remote-session',
      level: 'high',
      description: `Session ${id} approved for device ${session.device.deviceId}`,
      metadata: { sessionId: id, deviceId: session.deviceId },
    });

    return updated;
  }

  async rejectSession(id: string) {
    const session = await sessionRepository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'pending') {
      throw new Error(`Session is already ${session.status}`);
    }

    const updated = await sessionRepository.update(id, {
      status: 'rejected',
    });

    await this.auditService.logSecurityEvent({
      adminId: session.adminId,
      action: 'session_rejected',
      module: 'remote-session',
      level: 'info',
      description: `Session ${id} rejected for device ${session.device.deviceId}`,
      metadata: { sessionId: id, deviceId: session.deviceId },
    });

    return updated;
  }

  async endSession(id: string) {
    const session = await sessionRepository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'approved' && session.status !== 'active') {
      throw new Error(`Session is not active (status: ${session.status})`);
    }

    const updated = await sessionRepository.update(id, {
      status: 'ended',
      endedAt: new Date(),
    });

    // Clear active session cache
    const redis = getRedisClient();
    await redis.del(`active_session:${session.deviceId}`);

    await this.auditService.logSecurityEvent({
      adminId: session.adminId,
      action: 'session_ended',
      module: 'remote-session',
      level: 'high',
      description: `Session ${id} ended for device ${session.device.deviceId}`,
      metadata: { sessionId: id, deviceId: session.deviceId },
    });

    return updated;
  }

  async getSessionLogs(id: string) {
    const session = await sessionRepository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    return await sessionRepository.getLogs(id);
  }

  async updateSession(id: string, data: any) {
    const session = await sessionRepository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    const updated = await sessionRepository.update(id, data);

    await this.auditService.logSecurityEvent({
      adminId: session.adminId,
      action: 'session_updated',
      module: 'remote-session',
      level: 'info',
      description: `Session ${id} updated`,
      metadata: { sessionId: id, updatedFields: Object.keys(data) },
    });

    return updated;
  }

  async getActiveSession(deviceId: string) {
    const redis = getRedisClient();
    const cached = await redis.get(`active_session:${deviceId}`);

    if (cached) {
      return JSON.parse(cached);
    }

    const session = await sessionRepository.findActiveByDevice(deviceId);
    if (session) {
      await redis.setEx(
        `active_session:${deviceId}`,
        3600,
        JSON.stringify(session)
      );
    }

    return session;
  }
}
