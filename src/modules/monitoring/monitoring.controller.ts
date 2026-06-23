import { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { 
  createMonitoringSchema, 
  monitoringQuerySchema,
  monitoringStatsSchema 
} from './monitoring.validator';
import { logger } from '../../config/logger';

export class MonitoringController {
  private monitoringService: MonitoringService;
  private anomalyDetection: AnomalyDetectionService;

  constructor() {
    this.monitoringService = MonitoringService.getInstance();
    this.anomalyDetection = AnomalyDetectionService.getInstance();
  }

  getMonitoringData = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const query = monitoringQuerySchema.parse(req.query);
      const result = await this.monitoringService.getMonitoringHistory(deviceId, query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get monitoring data error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_MONITORING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get monitoring data',
        },
      });
    }
  };

  getRealtimeMonitoring = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const data = await this.monitoringService.getRealtimeMonitoring(deviceId);
      
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Get realtime monitoring error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_REALTIME_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get realtime monitoring',
        },
      });
    }
  };

  createMonitoring = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const data = createMonitoringSchema.parse(req.body);
      
      // Validate data consistency
      if (!this.monitoringService.validateDataConsistency(data)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'Invalid monitoring data',
          },
        });
      }

      // Detect anomalies
      const anomalyResult = await this.anomalyDetection.detectAnomalies(deviceId, data);
      
      const result = await this.monitoringService.processMonitoringData(deviceId, data);
      
      res.status(201).json({
        success: true,
        data: result,
        anomalyScore: anomalyResult.score,
        anomalies: anomalyResult.anomalies,
        message: 'Monitoring data saved successfully',
      });
    } catch (error) {
      logger.error('Create monitoring error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_MONITORING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to save monitoring data',
        },
      });
    }
  };

  getMonitoringStats = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const stats = await this.monitoringService.getMonitoringStats(deviceId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get monitoring stats error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get monitoring stats',
        },
      });
    }
  };

  getDeviceHealth = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const health = await this.monitoringService.getDeviceHealth(deviceId);
      
      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Get device health error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_HEALTH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get device health',
        },
      });
    }
  };

  getAnomalies = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const anomalies = await this.anomalyDetection.getAnomalies(deviceId);
      
      res.json({
        success: true,
        data: anomalies,
      });
    } catch (error) {
      logger.error('Get anomalies error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_ANOMALIES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get anomalies',
        },
      });
    }
  };
        }
