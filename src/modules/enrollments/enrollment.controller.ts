import { Request, Response } from 'express';
import { EnrollmentService } from './enrollment.service';
import {
  createEnrollmentSchema,
  updateEnrollmentSchema,
  enrollmentQuerySchema,
  approveEnrollmentSchema,
} from './enrollment.validator';
import { logger } from '../../config/logger';

export class EnrollmentController {
  private enrollmentService: EnrollmentService;

  constructor() {
    this.enrollmentService = EnrollmentService.getInstance();
  }

  getAllEnrollments = async (req: Request, res: Response) => {
    try {
      const query = enrollmentQuerySchema.parse(req.query);
      const result = await this.enrollmentService.getAllEnrollments(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all enrollments error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_ENROLLMENTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get enrollments',
        },
      });
    }
  };

  getEnrollmentById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const enrollment = await this.enrollmentService.getEnrollmentById(id);
      
      res.json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      logger.error('Get enrollment by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'ENROLLMENT_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Enrollment not found',
        },
      });
    }
  };

  createEnrollment = async (req: Request, res: Response) => {
    try {
      const data = createEnrollmentSchema.parse(req.body);
      const enrollment = await this.enrollmentService.createEnrollment(data);
      
      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Enrollment created successfully',
      });
    } catch (error) {
      logger.error('Create enrollment error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_ENROLLMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create enrollment',
        },
      });
    }
  };

  updateEnrollment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateEnrollmentSchema.parse(req.body);
      const enrollment = await this.enrollmentService.updateEnrollment(id, data);
      
      res.json({
        success: true,
        data: enrollment,
        message: 'Enrollment updated successfully',
      });
    } catch (error) {
      logger.error('Update enrollment error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_ENROLLMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update enrollment',
        },
      });
    }
  };

  deleteEnrollment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.enrollmentService.deleteEnrollment(id);
      
      res.json({
        success: true,
        message: 'Enrollment deleted successfully',
      });
    } catch (error) {
      logger.error('Delete enrollment error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_ENROLLMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete enrollment',
        },
      });
    }
  };

  approveEnrollment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = approveEnrollmentSchema.parse(req.body);
      const enrollment = await this.enrollmentService.approveEnrollment(id, data);
      
      res.json({
        success: true,
        data: enrollment,
        message: 'Enrollment approved successfully',
      });
    } catch (error) {
      logger.error('Approve enrollment error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'APPROVE_ENROLLMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to approve enrollment',
        },
      });
    }
  };

  rejectEnrollment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const enrollment = await this.enrollmentService.rejectEnrollment(id);
      
      res.json({
        success: true,
        data: enrollment,
        message: 'Enrollment rejected successfully',
      });
    } catch (error) {
      logger.error('Reject enrollment error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REJECT_ENROLLMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reject enrollment',
        },
      });
    }
  };

  verifyEnrollment = async (req: Request, res: Response) => {
    try {
      const { deviceId, pinCode } = req.params;
      const result = await this.enrollmentService.verifyEnrollment(deviceId, pinCode);
      
      res.json({
        success: true,
        data: result,
        message: 'Enrollment verified successfully',
      });
    } catch (error) {
      logger.error('Verify enrollment error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'VERIFY_ENROLLMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to verify enrollment',
        },
      });
    }
  };
}
