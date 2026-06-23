import { Request, Response } from 'express';
import { LocationService } from './location.service';
import {
  updateLocationSchema,
  locationQuerySchema,
  findDeviceSchema,
  lostModeSchema,
} from './location.validator';
import { logger } from '../../config/logger';

export class LocationController {
  private locationService: LocationService;

  constructor() {
    this.locationService = LocationService.getInstance();
  }

  updateLocation = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const data = updateLocationSchema.parse(req.body);
      const location = await this.locationService.updateLocation(deviceId, data);
      
      res.json({
        success: true,
        data: location,
        message: 'Location updated successfully',
      });
    } catch (error) {
      logger.error('Update location error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_LOCATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update location',
        },
      });
    }
  };

  getLiveLocation = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const location = await this.locationService.getLiveLocation(deviceId);
      
      res.json({
        success: true,
        data: location,
      });
    } catch (error) {
      logger.error('Get live location error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LIVE_LOCATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get live location',
        },
      });
    }
  };

  getLocationHistory = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const query = locationQuerySchema.parse(req.query);
      const result = await this.locationService.getLocationHistory(deviceId, query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get location history error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LOCATION_HISTORY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get location history',
        },
      });
    }
  };

  findDevice = async (req: Request, res: Response) => {
    try {
      const data = findDeviceSchema.parse(req.body);
      const location = await this.locationService.findDevice(data);
      
      res.json({
        success: true,
        data: location,
        message: 'Device found successfully',
      });
    } catch (error) {
      logger.error('Find device error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'FIND_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to find device',
        },
      });
    }
  };

  enableLostMode = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const data = lostModeSchema.parse(req.body);
      const result = await this.locationService.enableLostMode(deviceId, data);
      
      res.json({
        success: true,
        data: result,
        message: 'Lost mode enabled successfully',
      });
    } catch (error) {
      logger.error('Enable lost mode error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'ENABLE_LOST_MODE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to enable lost mode',
        },
      });
    }
  };

  disableLostMode = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const result = await this.locationService.disableLostMode(deviceId);
      
      res.json({
        success: true,
        data: result,
        message: 'Lost mode disabled successfully',
      });
    } catch (error) {
      logger.error('Disable lost mode error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DISABLE_LOST_MODE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to disable lost mode',
        },
      });
    }
  };

  getLocationStats = async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const stats = await this.locationService.getLocationStats(deviceId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get location stats error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LOCATION_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get location stats',
        },
      });
    }
  };
}
