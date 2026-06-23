import { Request, Response } from 'express';
import { StatisticsService } from './statistics.service';
import { logger } from '../../config/logger';

export class StatisticsController {
  private statisticsService: StatisticsService;

  constructor() {
    this.statisticsService = StatisticsService.getInstance();
  }

  getDeviceStatistics = async (req: Request, res: Response) => {
    try {
      const { period = 'day' } = req.query;
      const stats = await this.statisticsService.getDeviceStatistics(period as string);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get device statistics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_DEVICE_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get device statistics',
        },
      });
    }
  };

  getMonitoringStatistics = async (req: Request, res: Response) => {
    try {
      const { deviceId, period = 'day' } = req.query;
      const stats = await this.statisticsService.getMonitoringStatistics(
        deviceId as string,
        period as string
      );
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get monitoring statistics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_MONITORING_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get monitoring statistics',
        },
      });
    }
  };

  getLocationStatistics = async (req: Request, res: Response) => {
    try {
      const { deviceId, period = 'day' } = req.query;
      const stats = await this.statisticsService.getLocationStatistics(
        deviceId as string,
        period as string
      );
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get location statistics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LOCATION_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get location statistics',
        },
      });
    }
  };

  getSecurityStatistics = async (req: Request, res: Response) => {
    try {
      const { period = 'day' } = req.query;
      const stats = await this.statisticsService.getSecurityStatistics(period as string);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get security statistics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SECURITY_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get security statistics',
        },
      });
    }
  };

  getUsageStatistics = async (req: Request, res: Response) => {
    try {
      const { period = 'day' } = req.query;
      const stats = await this.statisticsService.getUsageStatistics(period as string);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get usage statistics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_USAGE_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get usage statistics',
        },
      });
    }
  };

  getOverallStatistics = async (req: Request, res: Response) => {
    try {
      const stats = await this.statisticsService.getOverallStatistics();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get overall statistics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_OVERALL_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get overall statistics',
        },
      });
    }
  };
}
