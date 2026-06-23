import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { SecurityUtil } from '../../utils/security.util';
import { logger } from '../../config/logger';
import crypto from 'crypto';

export class DeviceVerificationService {
  private static instance: DeviceVerificationService;
  private securityUtil: SecurityUtil;

  private constructor() {
    this.securityUtil = SecurityUtil.getInstance();
  }

  static getInstance(): DeviceVerificationService {
    if (!DeviceVerificationService.instance) {
      DeviceVerificationService.instance = new DeviceVerificationService();
    }
    return DeviceVerificationService.instance;
  }

  // Verify device authenticity with multiple checks
  async verifyDevice(deviceData: any): Promise<{
    verified: boolean;
    score: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let score = 0;
    const redis = getRedisClient();

    // Check 1: Device Fingerprint
    const fingerprint = this.securityUtil.generateDeviceFingerprint(deviceData);
    const storedFingerprint = await redis.get(`device_fingerprint:${deviceData.deviceId}`);
    
    if (storedFingerprint && storedFingerprint !== fingerprint) {
      reasons.push('Device fingerprint mismatch');
      score -= 30;
    } else {
      score += 20;
      await redis.setEx(`device_fingerprint:${deviceData.deviceId}`, 86400, fingerprint);
    }

    // Check 2: Check for suspicious data patterns
    if (this.securityUtil.detectSuspiciousPattern(deviceData)) {
      reasons.push('Suspicious data patterns detected');
      score -= 40;
    } else {
      score += 10;
    }

    // Check 3: Validate serial number format
    if (this.isValidSerialNumber(deviceData.serialNumber)) {
      score += 15;
    } else {
      reasons.push('Invalid serial number format');
      score -= 20;
    }

    // Check 4: Check device history
    const deviceHistory = await prisma.device.findUnique({
      where: { deviceId: deviceData.deviceId },
      include: {
        monitoring: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        locations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (deviceHistory) {
      // Check for impossible location jumps
      if (this.hasImpossibleLocationJump(deviceHistory.locations)) {
        reasons.push('Impossible location jump detected');
        score -= 25;
      }

      // Check for impossible battery jumps
      if (this.hasImpossibleBatteryJump(deviceHistory.monitoring)) {
        reasons.push('Impossible battery jump detected');
        score -= 25;
      }

      // Check for abnormal behavior
      if (this.hasAbnormalBehavior(deviceHistory)) {
        reasons.push('Abnormal device behavior detected');
        score -= 30;
      }
    }

    // Check 5: Rate limiting for device registration
    const deviceRegistrationCount = await redis.get(`device_registration:${deviceData.deviceId}`);
    if (deviceRegistrationCount && parseInt(deviceRegistrationCount) > 5) {
      reasons.push('Too many registration attempts');
      score -= 20;
    }

    // Check 6: Validate device age
    if (this.isDeviceAgeSuspicious(deviceData)) {
      reasons.push('Suspicious device age');
      score -= 15;
    }

    // Check 7: Network validation
    if (this.isNetworkSuspicious(deviceData.networkInfo)) {
      reasons.push('Suspicious network');
      score -= 20;
    }

    const verified = score >= 60;
    
    // Log verification result
    logger.info('Device verification result:', {
      deviceId: deviceData.deviceId,
      verified,
      score,
      reasons,
    });

    return { verified, score, reasons };
  }

  private isValidSerialNumber(serial: string): boolean {
    // Check if serial number matches common patterns
    const validPatterns = [
      /^[A-Z0-9]{8,16}$/, // Alphanumeric 8-16 chars
      /^[A-Z]{2}[0-9]{6,12}$/, // 2 letters + 6-12 numbers
      /^[0-9A-Za-z]{10,20}$/, // Alphanumeric 10-20 chars
    ];
    
    return validPatterns.some(pattern => pattern.test(serial));
  }

  private hasImpossibleLocationJump(locations: any[]): boolean {
    if (locations.length < 2) return false;
    
    const MAX_SPEED = 300; // km/h
    const EARTH_RADIUS = 6371; // km
    
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      const timeDiff = (new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 3600000; // hours
      const speed = distance / timeDiff;
      
      if (speed > MAX_SPEED) {
        return true;
      }
    }
    
    return false;
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

  private hasImpossibleBatteryJump(monitoring: any[]): boolean {
    if (monitoring.length < 2) return false;
    
    for (let i = 1; i < monitoring.length; i++) {
      const prev = monitoring[i - 1];
      const curr = monitoring[i];
      
      // Battery can't increase by more than 30% in 5 minutes
      const timeDiff = (new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 60000; // minutes
      if (timeDiff < 5) {
        const batteryDiff = curr.batteryLevel - prev.batteryLevel;
        if (batteryDiff > 30) {
          return true;
        }
      }
    }
    
    return false;
  }

  private hasAbnormalBehavior(deviceHistory: any): boolean {
    // Check for patterns that indicate simulation
    const patterns = [
      // Constant battery level for extended periods
      this.hasConstantBatteryLevel(deviceHistory.monitoring),
      // Identical locations for extended periods
      this.hasIdenticalLocations(deviceHistory.locations),
      // Missing data for long periods then suddenly active
      this.hasSuspiciousDataGaps(deviceHistory.monitoring),
    ];
    
    return patterns.some(pattern => pattern === true);
  }

  private hasConstantBatteryLevel(monitoring: any[]): boolean {
    if (monitoring.length < 10) return false;
    
    const levels = monitoring.map(m => m.batteryLevel);
    const uniqueLevels = new Set(levels);
    
    // If battery level hasn't changed in 10 readings, it's suspicious
    return uniqueLevels.size === 1;
  }

  private hasIdenticalLocations(locations: any[]): boolean {
    if (locations.length < 5) return false;
    
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      // Check if locations are identical (within 1 meter)
      if (Math.abs(prev.latitude - curr.latitude) < 0.00001 &&
          Math.abs(prev.longitude - curr.longitude) < 0.00001) {
        return true;
      }
    }
    
    return false;
  }

  private hasSuspiciousDataGaps(monitoring: any[]): boolean {
    if (monitoring.length < 2) return false;
    
    const GAP_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
    
    for (let i = 1; i < monitoring.length; i++) {
      const prev = new Date(monitoring[i - 1].createdAt).getTime();
      const curr = new Date(monitoring[i].createdAt).getTime();
      
      if (curr - prev > GAP_THRESHOLD) {
        return true;
      }
    }
    
    return false;
  }

  private isDeviceAgeSuspicious(deviceData: any): boolean {
    // Check if device model and Android version match typical release dates
    const suspiciousCombinations = [
      { model: 'Samsung Galaxy S24', minAndroid: 14 }, // Should be Android 14+
      { model: 'iPhone 15', minAndroid: 17 }, // iOS 17+
    ];
    
    // Check if device is too new (released in future)
    const releaseYear = this.getDeviceReleaseYear(deviceData.model);
    if (releaseYear && releaseYear > new Date().getFullYear()) {
      return true;
    }
    
    return false;
  }

  private getDeviceReleaseYear(model: string): number | null {
    // Simplified device release year mapping
    const releaseMap: Record<string, number> = {
      'Samsung Galaxy S24': 2024,
      'Samsung Galaxy S23': 2023,
      'iPhone 15': 2023,
      'iPhone 14': 2022,
      'Google Pixel 8': 2023,
      'OnePlus 12': 2024,
    };
    
    return releaseMap[model] || null;
  }

  private isNetworkSuspicious(networkInfo: string): boolean {
    // Check for suspicious network patterns
    const suspiciousNetworks = [
      'VPN',
      'Proxy',
      'Tor',
      'Virtual',
      'Test',
      'Demo',
      'localhost',
      '127.0.0.1',
    ];
    
    return suspiciousNetworks.some(network => 
      networkInfo.toLowerCase().includes(network.toLowerCase())
    );
  }
}
