import { prisma } from '../config/database';
import { FCMService } from './fcm.service';
import { EmailService } from './email.service';
import { logger } from '../config/logger';

export class NotificationService {
  private static instance: NotificationService;
  private fcmService: FCMService;

  private constructor() {
    this.fcmService = FCMService.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async sendNotification(data: {
    title: string;
    message: string;
    type: string;
    adminId?: string;
    deviceId?: string;
    metadata?: any;
    sendEmail?: boolean;
    sendFCM?: boolean;
  }) {
    try {
      // Save to database
      const notification = await prisma.notification.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          adminId: data.adminId,
          deviceId: data.deviceId,
          metadata: data.metadata,
        },
      });

      // Send email if requested
      if (data.sendEmail && data.adminId) {
        const admin = await prisma.admin.findUnique({
          where: { id: data.adminId },
        });
        if (admin) {
          await EmailService.sendEmail({
            to: admin.email,
            subject: data.title,
            html: `
              <h1>${data.title}</h1>
              <p>${data.message}</p>
              <p>Type: ${data.type}</p>
              <p>Time: ${new Date().toISOString()}</p>
            `,
          });
        }
      }

      // Send FCM if requested
      if (data.sendFCM && data.deviceId) {
        const device = await prisma.device.findUnique({
          where: { deviceId: data.deviceId },
        });
        if (device?.fcmToken) {
          await this.fcmService.sendToDevice(device.fcmToken, {
            title: data.title,
            body: data.message,
            data: {
              type: data.type,
              notificationId: notification.id,
              ...data.metadata,
            },
          });
        }
      }

      return notification;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  async getNotifications(filters: {
    adminId?: string;
    deviceId?: string;
    type?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { adminId, deviceId, type, isRead, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (deviceId) where.deviceId = deviceId;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string) {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(adminId: string) {
    return await prisma.notification.updateMany({
      where: {
        adminId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async deleteNotification(notificationId: string) {
    return await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  // Notification templates
  async sendDeviceOnlineNotification(deviceId: string, deviceName: string) {
    return this.sendNotification({
      title: 'Device Online',
      message: `${deviceName} is now online`,
      type: 'device_online',
      deviceId,
      sendFCM: true,
    });
  }

  async sendDeviceOfflineNotification(deviceId: string, deviceName: string) {
    return this.sendNotification({
      title: 'Device Offline',
      message: `${deviceName} went offline`,
      type: 'device_offline',
      deviceId,
      sendFCM: true,
    });
  }

  async sendLowBatteryNotification(deviceId: string, deviceName: string, batteryLevel: number) {
    return this.sendNotification({
      title: 'Low Battery Alert',
      message: `${deviceName} battery is at ${batteryLevel}%`,
      type: 'low_battery',
      deviceId,
      sendFCM: true,
      metadata: { batteryLevel },
    });
  }

  async sendSecurityAlertNotification(deviceId: string, alert: any) {
    return this.sendNotification({
      title: `Security Alert: ${alert.level}`,
      message: alert.title,
      type: 'security_alert',
      deviceId,
      sendFCM: true,
      sendEmail: true,
      metadata: {
        alertId: alert.id,
        level: alert.level,
        description: alert.description,
      },
    });
  }

  async sendNewEnrollmentNotification(deviceId: string, status: string) {
    return this.sendNotification({
      title: 'New Device Enrollment',
      message: `A new device has requested enrollment with status: ${status}`,
      type: 'enrollment',
      deviceId,
      sendEmail: true,
    });
  }

  async sendSessionStartedNotification(deviceId: string, adminId: string) {
    return this.sendNotification({
      title: 'Remote Session Started',
      message: `A remote session has been started with the device`,
      type: 'session_started',
      deviceId,
      adminId,
      sendFCM: true,
    });
  }

  async sendSessionEndedNotification(deviceId: string, adminId: string) {
    return this.sendNotification({
      title: 'Remote Session Ended',
      message: `The remote session has ended`,
      type: 'session_ended',
      deviceId,
      adminId,
      sendFCM: true,
    });
  }
}

export const notificationService = NotificationService.getInstance();
