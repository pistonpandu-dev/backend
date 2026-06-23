import { getFirebaseApp } from '../config/firebase';
import { logger } from '../config/logger';

export class FCMService {
  private static instance: FCMService;

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  async sendToDevice(deviceToken: string, payload: any) {
    try {
      const app = getFirebaseApp();
      const messaging = app.messaging();

      const message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      };

      const response = await messaging.send(message);
      logger.info('FCM message sent:', response);
      return response;
    } catch (error) {
      logger.error('Failed to send FCM message:', error);
      throw error;
    }
  }

  async sendToTopic(topic: string, payload: any) {
    try {
      const app = getFirebaseApp();
      const messaging = app.messaging();

      const message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      };

      const response = await messaging.send(message);
      logger.info('FCM topic message sent:', response);
      return response;
    } catch (error) {
      logger.error('Failed to send FCM topic message:', error);
      throw error;
    }
  }

  async sendToDevices(deviceTokens: string[], payload: any) {
    try {
      const app = getFirebaseApp();
      const messaging = app.messaging();

      const messages = deviceTokens.map(token => ({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      }));

      const response = await messaging.sendEach(messages);
      logger.info('FCM messages sent:', response);
      return response;
    } catch (error) {
      logger.error('Failed to send FCM messages:', error);
      throw error;
    }
  }

  // Notification templates
  async sendDeviceOnlineNotification(deviceToken: string, deviceName: string) {
    return this.sendToDevice(deviceToken, {
      title: 'Device Online',
      body: `${deviceName} is now online`,
      data: {
        type: 'device_online',
        deviceName,
      },
    });
  }

  async sendDeviceOfflineNotification(deviceToken: string, deviceName: string) {
    return this.sendToDevice(deviceToken, {
      title: 'Device Offline',
      body: `${deviceName} went offline`,
      data: {
        type: 'device_offline',
        deviceName,
      },
    });
  }

  async sendLowBatteryNotification(deviceToken: string, deviceName: string, batteryLevel: number) {
    return this.sendToDevice(deviceToken, {
      title: 'Low Battery Alert',
      body: `${deviceName} battery is at ${batteryLevel}%`,
      data: {
        type: 'low_battery',
        deviceName,
        batteryLevel: batteryLevel.toString(),
      },
    });
  }

  async sendSecurityAlertNotification(deviceToken: string, alert: any) {
    return this.sendToDevice(deviceToken, {
      title: `Security Alert: ${alert.level}`,
      body: alert.title,
      data: {
        type: 'security_alert',
        alertId: alert.id,
        level: alert.level,
      },
    });
  }
}
