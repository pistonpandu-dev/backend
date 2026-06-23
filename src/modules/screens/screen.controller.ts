import { Request, Response } from 'express';
import { ScreenService } from './screen.service';
import {
  captureScreenshotSchema,
  startRecordingSchema,
  screenQuerySchema,
} from './screen.validator';
import { logger } from '../../config/logger';

export class ScreenController {
  private screenService: ScreenService;

  constructor() {
    this.screenService = ScreenService.getInstance();
  }

  captureScreenshot = async (req: Request, res: Response) => {
    try {
      const data = captureScreenshotSchema.parse(req.body);
      const adminId = req.user.id;
      const result = await this.screenService.captureScreenshot(adminId, data);
      
      res.json({
        success: true,
        data: result,
        message: 'Screenshot captured successfully',
      });
    } catch (error) {
      logger.error('Capture screenshot error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CAPTURE_SCREENSHOT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to capture screenshot',
        },
      });
    }
  };

  startRecording = async (req: Request, res: Response) => {
    try {
      const data = startRecordingSchema.parse(req.body);
      const adminId = req.user.id;
      const result = await this.screenService.startRecording(adminId, data);
      
      res.json({
        success: true,
        data: result,
        message: 'Recording started successfully',
      });
    } catch (error) {
      logger.error('Start recording error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'START_RECORDING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to start recording',
        },
      });
    }
  };

  stopRecording = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.screenService.stopRecording(id);
      
      res.json({
        success: true,
        data: result,
        message: 'Recording stopped successfully',
      });
    } catch (error) {
      logger.error('Stop recording error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'STOP_RECORDING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to stop recording',
        },
      });
    }
  };

  getScreenshots = async (req: Request, res: Response) => {
    try {
      const query = screenQuerySchema.parse(req.query);
      const result = await this.screenService.getScreenshots(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get screenshots error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SCREENSHOTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get screenshots',
        },
      });
    }
  };

  getRecordings = async (req: Request, res: Response) => {
    try {
      const query = screenQuerySchema.parse(req.query);
      const result = await this.screenService.getRecordings(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get recordings error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_RECORDINGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get recordings',
        },
      });
    }
  };

  deleteScreenshot = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.screenService.deleteScreenshot(id);
      
      res.json({
        success: true,
        message: 'Screenshot deleted successfully',
      });
    } catch (error) {
      logger.error('Delete screenshot error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_SCREENSHOT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete screenshot',
        },
      });
    }
  };

  deleteRecording = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.screenService.deleteRecording(id);
      
      res.json({
        success: true,
        message: 'Recording deleted successfully',
      });
    } catch (error) {
      logger.error('Delete recording error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_RECORDING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete recording',
        },
      });
    }
  };
}
