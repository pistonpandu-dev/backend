import { Request, Response } from 'express';
import { SecurityService } from './security.service';
import { AuditService } from './audit.service';
import {
  securityAlertQuerySchema,
  auditLogQuerySchema,
  resolveAlertSchema,
} from './security.validator';
import { logger } from '../../config/logger';

export class SecurityController {
  private securityService: SecurityService;
  private auditService: AuditService;

  constructor() {
    this.securityService = SecurityService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  getSecurityAlerts = async (req: Request, res: Response) => {
    try {
      const query = securityAlertQuerySchema.parse(req.query);
      const result = await this.securityService.getSecurityAlerts(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get security alerts error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SECURITY_ALERTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get security alerts',
        },
      });
    }
  };

  getSecurityAlertById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const alert = await this.securityService.getSecurityAlertById(id);
      
      res.json({
        success: true,
        data: alert,
      });
    } catch (error) {
      logger.error('Get security alert by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'SECURITY_ALERT_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Security alert not found',
        },
      });
    }
  };

  resolveAlert = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = resolveAlertSchema.parse(req.body);
      const alert = await this.securityService.resolveAlert(id, data);
      
      res.json({
        success: true,
        data: alert,
        message: 'Alert resolved successfully',
      });
    } catch (error) {
      logger.error('Resolve alert error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'RESOLVE_ALERT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to resolve alert',
        },
      });
    }
  };

  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const query = auditLogQuerySchema.parse(req.query);
      const result = await this.auditService.getAuditLogs(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get audit logs error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_AUDIT_LOGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get audit logs',
        },
      });
    }
  };

  getSecurityStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.securityService.getSecurityStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get security stats error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SECURITY_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get security stats',
        },
      });
    }
  };

  checkSuspiciousActivity = async (req: Request, res: Response) => {
    try {
      const { ip, adminId } = req.body;
      const result = await this.securityService.checkSuspiciousActivity(adminId, ip);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Check suspicious activity error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CHECK_SUSPICIOUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check suspicious activity',
        },
      });
    }
  };

  blockIP = async (req: Request, res: Response) => {
    try {
      const { ip, reason, duration } = req.body;
      const result = await this.securityService.blockIP(ip, reason, duration);
      
      res.json({
        success: true,
        data: result,
        message: 'IP blocked successfully',
      });
    } catch (error) {
      logger.error('Block IP error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'BLOCK_IP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to block IP',
        },
      });
    }
  };

  unblockIP = async (req: Request, res: Response) => {
    try {
      const { ip } = req.params;
      await this.securityService.unblockIP(ip);
      
      res.json({
        success: true,
        message: 'IP unblocked successfully',
      });
    } catch (error) {
      logger.error('Unblock IP error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UNBLOCK_IP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to unblock IP',
        },
      });
    }
  };
}
