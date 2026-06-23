import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { logger } from '../../config/logger';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = DashboardService.getInstance();
  }

  getDashboardStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.dashboardService.getDashboardStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_DASHBOARD_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get dashboard stats',
        },
      });
    }
  };

  getDeviceAnalytics = async (req: Request, res: Response) => {
    try {
      const { period = 'day' } = req.query;
      const analytics = await this.dashboardService.getDeviceAnalytics(period as string);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Get device analytics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_DEVICE_ANALYTICS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get device analytics',
        },
      });
    }
  };

  getSecurityOverview = async (req: Request, res: Response) => {
    try {
      const overview = await this.dashboardService.getSecurityOverview();
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error('Get security overview error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SECURITY_OVERVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get security overview',
        },
      });
    }
  };

  getActivityFeed = async (req: Request, res: Response) => {
    try {
      const { limit = 20 } = req.query;
      const feed = await this.dashboardService.getActivityFeed(Number(limit));
      
      res.json({
        success: true,
        data: feed,
      });
    } catch (error) {
      logger.error('Get activity feed error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_ACTIVITY_FEED_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get activity feed',
        },
      });
    }
  };

  getLocationHeatmap = async (req: Request, res: Response) => {
    try {
      const heatmap = await this.dashboardService.getLocationHeatmap();
      
      res.json({
        success: true,
        data: heatmap,
      });
    } catch (error) {
      logger.error('Get location heatmap error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_HEATMAP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get location heatmap',
        },
      });
    }
  };
}
