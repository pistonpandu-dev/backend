import { Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { deviceService } from '../../modules/devices/device.service';

export class DeviceHandler {
  constructor(private socket: Socket) {}

  registerHandlers() {
    this.socket.on('device:status', this.handleDeviceStatus.bind(this));
    this.socket.on('device:update', this.handleDeviceUpdate.bind(this));
    this.socket.on('device:subscribe', this.handleSubscribe.bind(this));
    this.socket.on('device:unsubscribe', this.handleUnsubscribe.bind(this));
  }

  private async handleDeviceStatus(data: any) {
    try {
      const { deviceId } = data;
      const status = await deviceService.getDeviceStatus(deviceId);
      
      this.socket.emit('device:status:response', {
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Device status handler error:', error);
      this.socket.emit('device:status:error', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleDeviceUpdate(data: any) {
    try {
      const { deviceId, updates } = data;
      const result = await deviceService.updateDevice(deviceId, updates);
      
      this.socket.broadcast.emit('device:updated', result);
      this.socket.emit('device:update:response', {
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Device update handler error:', error);
      this.socket.emit('device:update:error', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private handleSubscribe(data: any) {
    const { deviceId } = data;
    this.socket.join(`device:${deviceId}`);
    logger.info(`Socket ${this.socket.id} subscribed to device ${deviceId}`);
  }

  private handleUnsubscribe(data: any) {
    const { deviceId } = data;
    this.socket.leave(`device:${deviceId}`);
    logger.info(`Socket ${this.socket.id} unsubscribed from device ${deviceId}`);
  }
}
