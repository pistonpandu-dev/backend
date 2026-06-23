import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';

export class AnomalyDetectionService {
  private static instance: AnomalyDetectionService;

  static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  async detectAnomalies(deviceId: string, monitoringData: any): Promise<{
    anomalies: string[];
    score: number;
  }> {
    const anomalies: string[] = [];
    let score = 100;
    const redis = getRedisClient();

    // Get historical data
    const historicalData = await prisma.deviceMonitoring.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // 1. Battery anomaly detection
    if (historicalData.length > 0) {
      const avgBattery = historicalData.reduce((sum, d) => sum + (d.batteryLevel || 0), 0) / historicalData.length;
      const currentBattery = monitoringData.batteryLevel || 0;
      
      if (Math.abs(currentBattery - avgBattery) > 20) {
        anomalies.push('Battery level anomaly detected');
        score -= 15;
      }

      // Check for battery level decreasing too fast
      if (historicalData.length > 5) {
        const lastFive = historicalData.slice(0, 5);
        const avgDecrease = (lastFive[0].batteryLevel - lastFive[4].batteryLevel) / 5;
        const currentDecrease = lastFive[0].batteryLevel - currentBattery;
        
        if (currentDecrease > avgDecrease * 3) {
          anomalies.push('Abnormal battery drain detected');
          score -= 20;
        }
      }
    }

    // 2. CPU usage anomaly detection
    if (historicalData.length > 0) {
      const avgCpu = historicalData.reduce((sum, d) => sum + (d.cpuUsage || 0), 0) / historicalData.length;
      const currentCpu = monitoringData.cpuUsage || 0;
      
      if (currentCpu > avgCpu * 2 && currentCpu > 80) {
        anomalies.push('Abnormal CPU usage detected');
        score -= 15;
      }
    }

    // 3. Storage anomaly detection
    if (historicalData.length > 0) {
      const avgStorage = historicalData.reduce((sum, d) => sum + (d.storageUsed || 0), 0) / historicalData.length;
      const currentStorage = monitoringData.storageUsed || 0;
      
      if (Math.abs(currentStorage - avgStorage) > 5 * 1024 * 1024 * 1024) { // 5GB difference
        anomalies.push('Storage usage anomaly detected');
        score -= 15;
      }
    }

    // 4. RAM usage anomaly detection
    if (historicalData.length > 0) {
      const avgRam = historicalData.reduce((sum, d) => sum + (d.ramUsed || 0), 0) / historicalData.length;
      const currentRam = monitoringData.ramUsed || 0;
      
      if (Math.abs(currentRam - avgRam) > 2 * 1024 * 1024 * 1024) { // 2GB difference
        anomalies.push('RAM usage anomaly detected');
        score -= 10;
      }
    }

    // 5. Temperature anomaly detection
    if (historicalData.length > 0) {
      const avgTemp = historicalData.reduce((sum, d) => sum + (d.temperature || 0), 0) / historicalData.length;
      const currentTemp = monitoringData.temperature || 0;
      
      if (currentTemp > avgTemp + 10) {
        anomalies.push('Temperature spike detected');
        score -= 10;
      }
    }

    // 6. Check for impossible values
    if (monitoringData.batteryLevel > 100 || monitoringData.batteryLevel < 0) {
      anomalies.push('Invalid battery level');
      score -= 30;
    }

    if (monitoringData.cpuUsage > 100 || monitoringData.cpuUsage < 0) {
      anomalies.push('Invalid CPU usage');
      score -= 30;
    }

    // 7. Check for data consistency
    if (historicalData.length > 0) {
      const lastData = historicalData[0];
      const timeDiff = new Date().getTime() - new Date(lastData.createdAt).getTime();
      
      if (timeDiff < 60000) { // Less than 1 minute
        // Check for duplicate data (possible simulation)
        const isDuplicate = this.isDataDuplicate(lastData, monitoringData);
        if (isDuplicate) {
          anomalies.push('Duplicate monitoring data detected');
          score -= 25;
        }
      }
    }

    // 8. Check data submission frequency
    const submissionKey = `submission:${deviceId}`;
    const submissionCount = await redis.incr(submissionKey);
    if (submissionCount === 1) {
      await redis.expire(submissionKey, 60);
    }
    
    if (submissionCount > 30) { // More than 30 submissions per minute
      anomalies.push('Excessive data submission');
      score -= 20;
    }

    // Log anomaly if score is low
    if (score < 70) {
      logger.warn('Anomalies detected in monitoring data', {
        deviceId,
        score,
        anomalies,
        data: monitoringData,
      });

      // Create security alert
      await prisma.securityAlert.create({
        data: {
          deviceId,
          level: score < 50 ? 'high' : 'medium',
          title: 'Device monitoring anomaly detected',
          description: anomalies.join(', '),
        },
      });
    }

    return { anomalies, score };
  }

  private isDataDuplicate(data1: any, data2: any): boolean {
    const fields = ['batteryLevel', 'cpuUsage', 'temperature', 'storageUsed', 'ramUsed'];
    
    let matchCount = 0;
    for (const field of fields) {
      if (data1[field] === data2[field]) {
        matchCount++;
      }
    }
    
    return matchCount >= 3; // At least 3 fields match
  }

  // Validate monitoring data consistency
  validateDataConsistency(data: any): boolean {
    // Check for negative values
    if (data.batteryLevel < 0 || data.batteryLevel > 100) return false;
    if (data.cpuUsage < 0 || data.cpuUsage > 100) return false;
    if (data.temperature < -50 || data.temperature > 100) return false;
    
    // Check for unrealistic values
    if (data.storageUsed && data.totalStorage && data.storageUsed > data.totalStorage) return false;
    if (data.ramUsed && data.ramTotal && data.ramUsed > data.ramTotal) return false;
    
    return true;
  }

  // Detect device hijacking attempts
  async detectDeviceHijacking(deviceId: string, newData: any): Promise<boolean> {
    const redis = getRedisClient();
    const deviceFingerprint = await redis.get(`device_fingerprint:${deviceId}`);
    
    if (!deviceFingerprint) return false;
    
    // Check if device fingerprint matches
    const currentFingerprint = this.generateFingerprint(newData);
    if (deviceFingerprint !== currentFingerprint) {
      logger.warn('Possible device hijacking detected', {
        deviceId,
        oldFingerprint: deviceFingerprint,
        newFingerprint: currentFingerprint,
      });
      
      await prisma.securityAlert.create({
        data: {
          deviceId,
          level: 'critical',
          title: 'Possible device hijacking detected',
          description: 'Device fingerprint mismatch',
        },
      });
      
      return true;
    }
    
    return false;
  }

  private generateFingerprint(data: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const stringData = JSON.stringify({
      androidVersion: data.androidVersion,
      sdkVersion: data.sdkVersion,
      screenResolution: data.screenResolution,
    });
    hash.update(stringData);
    return hash.digest('hex');
  }
}
