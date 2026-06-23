import { Request, Response } from 'express';
import { DeviceService } from './device.service';
import { DeviceVerificationService } from './device-verification.service';
import {
  createDeviceSchema,
  updateDeviceSchema,
  deviceQuerySchema,
  deviceInfoSchema,
} from './device.validator';
import { logger } from '../../config/logger';

export class DeviceController {
  private deviceService: DeviceService;
  private verificationService: DeviceVerificationService;

  constructor() {
    this.deviceService = DeviceService.getInstance();
    this.verificationService = DeviceVerificationService.getInstance();
  }

  getAllDevices = async (req: Request, res: Response) => {
    try {
      const query = deviceQuerySchema.parse(req.query);
      const result = await this.deviceService.getAllDevices(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all devices error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_DEVICES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get devices',
        },
      });
    }
  };

  getDeviceById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const device = await this.deviceService.getDeviceById(id);
      
      res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      logger.error('Get device by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Device not found',
        },
      });
    }
  };

  registerDevice = async (req: Request, res: Response) => {
    try {
      const data = createDeviceSchema.parse(req.body);
      
      // Verify device
      const verification = await this.verificationService.verifyDevice(data);
      
      if (!verification.verified) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Device verification failed',
            reasons: verification.reasons,
          },
        });
      }

      const device = await this.deviceService.registerDevice(data);
      
      res.status(201).json({
        success: true,
        data: device,
        verificationScore: verification.score,
        message: 'Device registered successfully',
      });
    } catch (error) {
      logger.error('Register device error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTER_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to register device',
        },
      });
    }
  };

  updateDevice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateDeviceSchema.parse(req.body);
      const device = await this.deviceService.updateDevice(id, data);
      
      res.json({
        success: true,
        data: device,
        message: 'Device updated successfully',
      });
    } catch (error) {
      logger.error('Update device error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update device',
        },
      });
    }
  };

  deleteDevice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.deviceService.deleteDevice(id);
      
      res.json({
        success: true,
        message: 'Device deleted successfully',
      });
    } catch (error) {
      logger.error('Delete device error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete device',
        },
      });
    }
  };

  getDeviceStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const status = await this.deviceService.getDeviceStatus(id);
      
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Get device status error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get device status',
        },
      });
    }
  };

  updateDeviceInfo = async (req: Request, res: Response) => {
    try {
      const data = deviceInfoSchema.parse(req.body);
      
      // Verify device first
      const verification = await this.verificationService.verifyDevice(data);
      
      if (!verification.verified) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Device verification failed',
            reasons: verification.reasons,
          },
        });
      }

      const device = await this.deviceService.updateDeviceInfo(data);
      
      res.json({
        success: true,
        data: device,
        verificationScore: verification.score,
        message: 'Device info updated successfully',
      });
    } catch (error) {
      logger.error('Update device info error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_INFO_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update device info',
        },
      });
    }
  };

  getDeviceStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.deviceService.getDeviceStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get device stats error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get device stats',
        },
      });
    }
  };
}
