import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { SecurityUtil } from '../../utils/security.util';

export class MonitoringService {
  private static instance: MonitoringService;
  private anomalyDetection: AnomalyDetectionService;
  private securityUtil: SecurityUtil;

  private constructor() {
    this.anomalyDetection = AnomalyDetectionService.getInstance();
    this.securityUtil = SecurityUtil.getInstance();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Process monitoring data with validation
  async processMonitoringData(deviceId: string, data: any): Promise<any> {
    const redis = getRedisClient();

    // 1. Validate device exists
    const device = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    // 2. Validate data consistency
    if (!this.anomalyDetection.validateDataConsistency(data)) {
      logger.warn('Inconsistent monitoring data', {
        deviceId,
        data,
      });
      throw new Error('Invalid monitoring data');
    }

    // 3. Check for duplicate data
    const isDuplicate = await this.checkDuplicateData(deviceId, data);
    if (isDuplicate) {
      logger.warn('Duplicate monitoring data', {
        deviceId,
        data,
      });
      throw new Error('Duplicate data detected');
    }

    // 4. Detect anomalies
    const anomalyResult = await this.anomalyDetection.detectAnomalies(deviceId, data);

    // 5. Check for device hijacking
    const isHijacked = await this.anomalyDetection.detectDeviceHijacking(deviceId, data);
    if (isHijacked) {
      throw new Error('Device hijacking detected');
    }

    // 6. Store monitoring data
    const monitoring = await prisma.deviceMonitoring.create({
      data: {
        deviceId: device.id,
        batteryLevel: data.batteryLevel,
        chargingStatus: data.chargingStatus,
        storageUsed: BigInt(data.storageUsed || 0),
        ramUsed: BigInt(data.ramUsed || 0),
        cpuUsage: data.cpuUsage,
        temperature: data.temperature,
        wifiInfo: data.wifiInfo,
        mobileNetwork: data.mobileNetwork,
        lastActive: new Date(),
      },
    });

    // 7. Update device status
    await prisma.device.update({
      where: { id: device.id },
      data: {
        status: data.batteryLevel > 0 ? 'online' : 'offline',
        lastSeen: new Date(),
        batteryHealth: data.batteryHealth || device.batteryHealth,
      },
    });

    // 8. Handle anomalies
    if (anomalyResult.score < 70) {
      await this.handleAnomalies(device, anomalyResult, data);
    }

    // 9. Cache recent data
    await redis.setEx(
      `device_monitoring:${deviceId}`,
      300, // 5 minutes
      JSON.stringify(monitoring)
    );

    // 10. Update real-time monitoring
    await this.updateRealTimeMonitoring(deviceId, monitoring);

    logger.info('Monitoring data processed', {
      deviceId,
      anomalyScore: anomalyResult.score,
      anomalies: anomalyResult.anomalies,
    });

    return {
      monitoring,
      anomalyScore: anomalyResult.score,
      anomalies: anomalyResult.anomalies,
    };
  }

  private async checkDuplicateData(deviceId: string, data: any): Promise<boolean> {
    const redis = getRedisClient();
    const key = `last_monitoring:${deviceId}`;
    const lastData = await redis.get(key);

    if (!lastData) {
      await redis.setEx(key, 60, JSON.stringify(data));
      return false;
    }

    const parsed = JSON.parse(lastData);
    
    // Check if data is too similar (within 5% tolerance)
    const tolerance = 0.05;
    const fields = ['batteryLevel', 'cpuUsage', 'temperature'];
    
    let similarCount = 0;
    for (const field of fields) {
      if (data[field] !== undefined && parsed[field] !== undefined) {
        const diff = Math.abs(data[field] - parsed[field]);
        const avg = (data[field] + parsed[field]) / 2;
        if (avg > 0 && diff / avg < tolerance) {
          similarCount++;
        }
      }
    }

    // Update cache
    await redis.setEx(key, 60, JSON.stringify(data));

    // Consider duplicate if all fields are similar
    return similarCount === fields.length;
  }

  private async handleAnomalies(device: any, anomalyResult: any, data: any): Promise<void> {
    // Create security alert for critical anomalies
    if (anomalyResult.score < 50) {
      await prisma.securityAlert.create({
        data: {
          deviceId: device.id,
          level: 'critical',
          title: 'Critical anomalies detected',
          description: anomalyResult.anomalies.join(', '),
        },
      });

      // Send notification
      await this.sendCriticalAlert(device, anomalyResult, data);
    } else if (anomalyResult.score < 70) {
      await prisma.securityAlert.create({
        data: {
          deviceId: device.id,
          level: 'high',
          title: 'Multiple anomalies detected',
          description: anomalyResult.anomalies.join(', '),
        },
      });
    }

    // Log anomalies
    logger.warn('Monitoring anomalies detected', {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      score: anomalyResult.score,
      anomalies: anomalyResult.anomalies,
      data,
    });
  }

  private async sendCriticalAlert(device: any, anomalyResult: any, data: any): Promise<void> {
    // Send email notification to admin
    // This would use your email service
    logger.info('Critical alert sent for device', {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      anomalies: anomalyResult.anomalies,
    });
  }

  private async updateRealTimeMonitoring(deviceId: string, monitoring: any): Promise<void> {
    const redis = getRedisClient();
    const key = `realtime_monitoring:${deviceId}`;
    await redis.setEx(key, 60, JSON.stringify(monitoring));
  }

  // Get monitoring history with filters
  async getMonitoringHistory(deviceId: string, filters: any): Promise<any> {
    const { startDate, endDate, limit = 100, offset = 0 } = filters;

    const where: any = { deviceId };

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const monitoring = await prisma.deviceMonitoring.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.deviceMonitoring.count({ where });

    return {
      data: monitoring,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  // Get real-time monitoring data
  async getRealtimeMonitoring(deviceId: string): Promise<any> {
    const redis = getRedisClient();
    const key = `realtime_monitoring:${deviceId}`;
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const monitoring = await prisma.deviceMonitoring.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });

    return monitoring;
  }

  // Get monitoring statistics
  async getMonitoringStats(deviceId: string): Promise<any> {
    const stats = await prisma.$transaction([
      prisma.deviceMonitoring.aggregate({
        where: { deviceId },
        _avg: {
          batteryLevel: true,
          cpuUsage: true,
          temperature: true,
        },
        _min: {
          batteryLevel: true,
          cpuUsage: true,
          temperature: true,
        },
        _max: {
          batteryLevel: true,
          cpuUsage: true,
          temperature: true,
        },
        _count: true,
      }),
      prisma.deviceMonitoring.groupBy({
        by: ['chargingStatus'],
        where: { deviceId },
        _count: true,
      }),
    ]);

    return {
      averages: stats[0]._avg,
      min: stats[0]._min,
      max: stats[0]._max,
      total: stats[0]._count,
      chargingStats: stats[1],
    };
  }
}
