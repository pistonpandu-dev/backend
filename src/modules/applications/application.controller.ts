import { Request, Response } from 'express';
import { ApplicationService } from './application.service';
import {
  syncApplicationsSchema,
  applicationQuerySchema,
} from './application.validator';
import { logger } from '../../config/logger';

export class ApplicationController {
  private applicationService: ApplicationService;

  constructor() {
    this.applicationService = ApplicationService.getInstance();
  }

  getApplications = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const query = applicationQuerySchema.parse(req.query);
      const result = await this.applicationService.getApplications(deviceId, query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get applications error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_APPLICATIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get applications',
        },
      });
    }
  };

  syncApplications = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const data = syncApplicationsSchema.parse(req.body);
      const result = await this.applicationService.syncApplications(deviceId, data);
      
      res.json({
        success: true,
        data: result,
        message: 'Applications synced successfully',
      });
    } catch (error) {
      logger.error('Sync applications error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'SYNC_APPLICATIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to sync applications',
        },
      });
    }
  };

  getApplicationStats = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const stats = await this.applicationService.getApplicationStats(deviceId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get application stats error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_APP_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get application stats',
        },
      });
    }
  };

  searchApplications = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { q } = req.query;
      const results = await this.applicationService.searchApplications(deviceId, q as string);
      
      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Search applications error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'SEARCH_APPLICATIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search applications',
        },
      });
    }
  };
}
