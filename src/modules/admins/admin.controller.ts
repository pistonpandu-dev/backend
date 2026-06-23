import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { 
  createAdminSchema, 
  updateAdminSchema, 
  adminQuerySchema 
} from './admin.validator';
import { logger } from '../../config/logger';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = AdminService.getInstance();
  }

  getAllAdmins = async (req: Request, res: Response) => {
    try {
      const query = adminQuerySchema.parse(req.query);
      const result = await this.adminService.getAllAdmins(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all admins error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_ADMINS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get admins',
        },
      });
    }
  };

  getAdminById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const admin = await this.adminService.getAdminById(id);
      
      res.json({
        success: true,
        data: admin,
      });
    } catch (error) {
      logger.error('Get admin by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Admin not found',
        },
      });
    }
  };

  createAdmin = async (req: Request, res: Response) => {
    try {
      const data = createAdminSchema.parse(req.body);
      const admin = await this.adminService.createAdmin(data);
      
      res.status(201).json({
        success: true,
        data: admin,
        message: 'Admin created successfully',
      });
    } catch (error) {
      logger.error('Create admin error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_ADMIN_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create admin',
        },
      });
    }
  };

  updateAdmin = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateAdminSchema.parse(req.body);
      const admin = await this.adminService.updateAdmin(id, data);
      
      res.json({
        success: true,
        data: admin,
        message: 'Admin updated successfully',
      });
    } catch (error) {
      logger.error('Update admin error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_ADMIN_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update admin',
        },
      });
    }
  };

  deleteAdmin = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.adminService.deleteAdmin(id);
      
      res.json({
        success: true,
        message: 'Admin deleted successfully',
      });
    } catch (error) {
      logger.error('Delete admin error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_ADMIN_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete admin',
        },
      });
    }
  };

  toggleAdminStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const admin = await this.adminService.toggleAdminStatus(id, isActive);
      
      res.json({
        success: true,
        data: admin,
        message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      logger.error('Toggle admin status error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'TOGGLE_STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to toggle admin status',
        },
      });
    }
  };
}
