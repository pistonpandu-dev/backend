import { Request, Response } from 'express';
import { GeofenceService } from './geofence.service';
import {
  createGeofenceSchema,
  updateGeofenceSchema,
  geofenceQuerySchema,
  geofenceEventSchema,
} from './geofence.validator';
import { logger } from '../../config/logger';

export class GeofenceController {
  private geofenceService: GeofenceService;

  constructor() {
    this.geofenceService = GeofenceService.getInstance();
  }

  getAllGeofences = async (req: Request, res: Response) => {
    try {
      const query = geofenceQuerySchema.parse(req.query);
      const result = await this.geofenceService.getAllGeofences(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all geofences error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_GEOFENCES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get geofences',
        },
      });
    }
  };

  getGeofenceById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const geofence = await this.geofenceService.getGeofenceById(id);
      
      res.json({
        success: true,
        data: geofence,
      });
    } catch (error) {
      logger.error('Get geofence by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'GEOFENCE_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Geofence not found',
        },
      });
    }
  };

  createGeofence = async (req: Request, res: Response) => {
    try {
      const data = createGeofenceSchema.parse(req.body);
      const geofence = await this.geofenceService.createGeofence(data);
      
      res.status(201).json({
        success: true,
        data: geofence,
        message: 'Geofence created successfully',
      });
    } catch (error) {
      logger.error('Create geofence error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_GEOFENCE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create geofence',
        },
      });
    }
  };

  updateGeofence = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateGeofenceSchema.parse(req.body);
      const geofence = await this.geofenceService.updateGeofence(id, data);
      
      res.json({
        success: true,
        data: geofence,
        message: 'Geofence updated successfully',
      });
    } catch (error) {
      logger.error('Update geofence error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_GEOFENCE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update geofence',
        },
      });
    }
  };

  deleteGeofence = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.geofenceService.deleteGeofence(id);
      
      res.json({
        success: true,
        message: 'Geofence deleted successfully',
      });
    } catch (error) {
      logger.error('Delete geofence error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_GEOFENCE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete geofence',
        },
      });
    }
  };

  toggleGeofence = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const geofence = await this.geofenceService.toggleGeofence(id, isActive);
      
      res.json({
        success: true,
        data: geofence,
        message: `Geofence ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      logger.error('Toggle geofence error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'TOGGLE_GEOFENCE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to toggle geofence',
        },
      });
    }
  };

  getGeofenceLogs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const query = geofenceQuerySchema.parse(req.query);
      const result = await this.geofenceService.getGeofenceLogs(id, query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get geofence logs error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_GEOFENCE_LOGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get geofence logs',
        },
      });
    }
  };

  triggerGeofenceEvent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = geofenceEventSchema.parse(req.body);
      const result = await this.geofenceService.triggerGeofenceEvent(id, data);
      
      res.json({
        success: true,
        data: result,
        message: 'Geofence event triggered successfully',
      });
    } catch (error) {
      logger.error('Trigger geofence event error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'TRIGGER_EVENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to trigger geofence event',
        },
      });
    }
  };
}
