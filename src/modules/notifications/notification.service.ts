import { notificationRepository } from './notification.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { EmailService } from '../../services/email.service';
import { FCMService } from '../../services/fcm.service';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

export class NotificationService {
  private static instance: NotificationService;
  private auditService: SecurityAuditService;
  private emailService: EmailService;
  private fcmService: FCMService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
    this.emailService = EmailService.getInstance();
    this.fcmService = FCMService.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getNotifications(query: any) {
    const { adminId, deviceId, type, isRead, page = 1, limit = 20 } = query;

    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (deviceId) where.deviceId = deviceId;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    return await notificationRepository.findAll(where, page, limit);
  }

  async getNotificationById(id: string) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async createNotification(data: any) {
    const { title, message, type, adminId, deviceId, metadata, sendEmail, sendFCM } = data;

    // Save to database
    const notification = await notificationRepository.create({
      title,
      message,
      type,
      adminId,
      deviceId,
      metadata,
    });

    // Send email if requested
    if (sendEmail && adminId) {
      const admin = await notificationRepository.getAdmin(adminId);
      if (admin) {
        await this.emailService.sendEmail({
          to: admin.email,
          subject: title,
          html: `
            <h1>${title}</h1>
            <p>${message}</p>
            <p>Type: ${type}</p>
            <p>Time: ${new Date().toISOString()}</p>
          `,
        });
      }
    }

    // Send FCM if requested
    if (sendFCM && deviceId) {
      const device = await deviceRepository.findByDeviceId(deviceId);
      if (device?.fcmToken) {
        await this.fcmService.sendToDevice(device.fcmToken, {
          title,
          body: message,
          data: {
            type,
            notificationId: notification.id,
            ...metadata,
          },
        });
      }
    }

    // Cache notification for real-time
    const redis = getRedisClient();
    await redis.setEx(
      `notification:${notification.id}`,
      3600,
      JSON.stringify(notification)
    );

    await this.auditService.logSecurityEvent({
      action: 'notification_created',
      module: 'notifications',
      level: 'info',
      description: `Notification ${type} created`,
      metadata: { notificationId: notification.id, type },
    });

    return notification;
  }

  async markAsRead(id: string) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }

    const updated = await notificationRepository.update(id, {
      isRead: true,
      readAt: new Date(),
    });

    // Update cache
    const redis = getRedisClient();
    await redis.setEx(
      `notification:${id}`,
      3600,
      JSON.stringify(updated)
    );

    return updated;
  }

  async markManyAsRead(ids: string[]) {
    for (const id of ids) {
      await this.markAsRead(id);
    }
  }

  async markAllAsRead(adminId: string) {
    await notificationRepository.markAllAsRead(adminId);
  }

  async deleteNotification(id: string) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }

    await notificationRepository.delete(id);

    // Remove from cache
    const redis = getRedisClient();
    await redis.del(`notification:${id}`);
  }

  async getUnreadCount(adminId: string) {
    return await notificationRepository.getUnreadCount(adminId);
  }

  async sendTestNotification(adminId: string, deviceId: string, type: string) {
    const messages = {
      device_online: { title: 'Device Online', message: 'Test device online notification' },
      device_offline: { title: 'Device Offline', message: 'Test device offline notification' },
      low_battery: { title: 'Low Battery', message: 'Test low battery notification' },
      security_alert: { title: 'Security Alert', message: 'Test security alert notification' },
      geofence: { title: 'Geofence Alert', message: 'Test geofence notification' },
      session: { title: 'Session Alert', message: 'Test session notification' },
    };

    const selected = messages[type as keyof typeof messages] || messages.security_alert;

    return await this.createNotification({
      title: selected.title,
      message: selected.message,
      type,
      adminId,
      deviceId,
      sendEmail: true,
      sendFCM: true,
      metadata: { test: true },
    });
  }
}
