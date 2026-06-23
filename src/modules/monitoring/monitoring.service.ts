import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { SecurityUtil } from '../../utils/security.util';
import { deviceRepository } from '../devices/device.repository';

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

  async processMonitoringData(deviceId: string, data: any): Promise<any> {
    const redis = getRedisClient();

    // Validate device exists
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Check for duplicate data
    const isDuplicate = await this.checkDuplicateData(deviceId, data);
    if (isDuplicate) {
      throw new Error('Duplicate data detected');
    }

    // Detect anomalies
    const anomalyResult = await this.anomalyDetection.detectAnomalies(deviceId, data);

    // Check for device hijacking
    const isHijacked = await this.anomalyDetection.detectDeviceHijacking(deviceId, data);
    if (isHijacked) {
      throw new Error('Device hijacking detected');
    }

    // Store monitoring data
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

    // Update device status
    await deviceRepository.updateStatus(device.id, data.batteryLevel > 0 ? 'online' : 'offline');

    // Handle anomalies
    if (anomalyResult.score < 70) {
      await this.handleAnomalies(device, anomalyResult, data);
    }

    // Cache recent data
    await redis.setEx(
      `device_monitoring:${deviceId}`,
      300,
      JSON.stringify(monitoring)
    );

    // Update real-time monitoring
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

  async getMonitoringHistory(deviceId: string, filters: any): Promise<any> {
    const { startDate, endDate, limit = 100, offset = 0, type } = filters;

    const where: any = { deviceId };

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    // Filter by type (battery, cpu, memory, etc)
    if (type) {
      // Add type filtering logic here
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

  async getDeviceHealth(deviceId: string): Promise<any> {
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const monitoring = await prisma.deviceMonitoring.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Calculate health score
    let healthScore = 100;

    // Check battery health
    const avgBattery = monitoring.reduce((sum, m) => sum + (m.batteryLevel || 0), 0) / monitoring.length;
    if (avgBattery < 20) {
      healthScore -= 30;
    } else if (avgBattery < 50) {
      healthScore -= 15;
    }

    // Check CPU usage
    const avgCpu = monitoring.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / monitoring.length;
    if (avgCpu > 80) {
      healthScore -= 20;
    } else if (avgCpu > 60) {
      healthScore -= 10;
    }

    // Check temperature
    const avgTemp = monitoring.reduce((sum, m) => sum + (m.temperature || 0), 0) / monitoring.length;
    if (avgTemp > 45) {
      healthScore -= 20;
    } else if (avgTemp > 35) {
      healthScore -= 10;
    }

    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      healthScore: Math.max(0, healthScore),
      status: device.status,
      lastSeen: device.lastSeen,
      averages: {
        batteryLevel: avgBattery,
        cpuUsage: avgCpu,
        temperature: avgTemp,
      },
      sampleCount: monitoring.length,
    };
  }

  validateDataConsistency(data: any): boolean {
    // Check for negative values
    if (data.batteryLevel !== undefined && (data.batteryLevel < 0 || data.batteryLevel > 100)) return false;
    if (data.cpuUsage !== undefined && (data.cpuUsage < 0 || data.cpuUsage > 100)) return false;
    if (data.temperature !== undefined && (data.temperature < -50 || data.temperature > 100)) return false;
    
    // Check for unrealistic values
    if (data.storageUsed !== undefined && data.totalStorage !== undefined) {
      if (data.storageUsed > data.totalStorage) return false;
    }
    if (data.ramUsed !== undefined && data.ramTotal !== undefined) {
      if (data.ramUsed > data.ramTotal) return false;
    }
    
    return true;
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

    await redis.setEx(key, 60, JSON.stringify(data));

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

    logger.warn('Monitoring anomalies detected', {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      score: anomalyResult.score,
      anomalies: anomalyResult.anomalies,
      data,
    });
  }

  private async updateRealTimeMonitoring(deviceId: string, monitoring: any): Promise<void> {
    const redis = getRedisClient();
    const key = `realtime_monitoring:${deviceId}`;
    await redis.setEx(key, 60, JSON.stringify(monitoring));
  }
}
