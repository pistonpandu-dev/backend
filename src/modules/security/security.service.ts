import { securityRepository } from './security.repository';
import { AuditService } from './audit.service';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';

export class SecurityService {
  private static instance: SecurityService;
  private auditService: AuditService;

  private constructor() {
    this.auditService = AuditService.getInstance();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async getSecurityAlerts(query: any) {
    return await securityRepository.getAlerts(query);
  }

  async getSecurityAlertById(id: string) {
    const alert = await securityRepository.getAlertById(id);
    if (!alert) {
      throw new Error('Security alert not found');
    }
    return alert;
  }

  async resolveAlert(id: string, data: any) {
    const alert = await securityRepository.getAlertById(id);
    if (!alert) {
      throw new Error('Security alert not found');
    }

    const updated = await securityRepository.updateAlert(id, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: data.resolvedBy || 'system',
      actionTaken: data.actionTaken,
    });

    await this.auditService.logSecurityEvent({
      action: 'alert_resolved',
      module: 'security',
      level: 'info',
      description: `Alert ${id} resolved`,
      metadata: { alertId: id, actionTaken: data.actionTaken },
    });

    return updated;
  }

  async getSecurityStats() {
    return await securityRepository.getStats();
  }

  async checkSuspiciousActivity(adminId: string, ipAddress: string) {
    const reasons: string[] = [];
    let suspicious = false;
    const redis = getRedisClient();

    // Check login attempts
    const loginKey = `login_attempts:${adminId}`;
    const loginAttempts = parseInt(await redis.get(loginKey) || '0');
    
    if (loginAttempts > 10) {
      reasons.push('Multiple login attempts detected');
      suspicious = true;
    }

    // Check failed attempts
    const failedKey = `failed_attempts:${ipAddress}`;
    const failedAttempts = parseInt(await redis.get(failedKey) || '0');
    
    if (failedAttempts > 5) {
      reasons.push('Multiple failed attempts from same IP');
      suspicious = true;
    }

    // Check action frequency
    const actionKey = `action_frequency:${adminId}`;
    const actionCount = parseInt(await redis.get(actionKey) || '0');
    const newCount = actionCount + 1;
    
    await redis.setEx(actionKey, 60, newCount.toString());
    
    if (newCount > 60) {
      reasons.push('Excessive action frequency');
      suspicious = true;
    }

    if (suspicious) {
      await this.auditService.logSecurityEvent({
        adminId,
        action: 'suspicious_activity_detected',
        module: 'security',
        level: 'high',
        description: reasons.join(', '),
        ipAddress,
        metadata: { reasons },
      });
    }

    return { suspicious, reasons };
  }

  async blockIP(ip: string, reason: string, duration: number = 3600) {
    const redis = getRedisClient();
    await redis.setEx(`blocked_ip:${ip}`, duration, 'true');

    await this.auditService.logSecurityEvent({
      action: 'ip_blocked',
      module: 'security',
      level: 'high',
      description: `IP ${ip} blocked`,
      metadata: { ip, reason, duration },
    });

    return { ip, blocked: true, expiresIn: duration };
  }

  async unblockIP(ip: string) {
    const redis = getRedisClient();
    await redis.del(`blocked_ip:${ip}`);

    await this.auditService.logSecurityEvent({
      action: 'ip_unblocked',
      module: 'security',
      level: 'info',
      description: `IP ${ip} unblocked`,
      metadata: { ip },
    });

    return { ip, unblocked: true };
  }
}
