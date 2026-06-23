import { Request, Response } from 'express';
import { SessionService } from './session.service';
import {
  requestSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
} from './session.validator';
import { logger } from '../../config/logger';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = SessionService.getInstance();
  }

  getAllSessions = async (req: Request, res: Response) => {
    try {
      const query = sessionQuerySchema.parse(req.query);
      const result = await this.sessionService.getAllSessions(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all sessions error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SESSIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get sessions',
        },
      });
    }
  };

  getSessionById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await this.sessionService.getSessionById(id);
      
      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error('Get session by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Session not found',
        },
      });
    }
  };

  requestSession = async (req: Request, res: Response) => {
    try {
      const data = requestSessionSchema.parse(req.body);
      const adminId = req.user.id;
      const session = await this.sessionService.requestSession(adminId, data);
      
      res.status(201).json({
        success: true,
        data: session,
        message: 'Session requested successfully',
      });
    } catch (error) {
      logger.error('Request session error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REQUEST_SESSION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to request session',
        },
      });
    }
  };

  approveSession = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await this.sessionService.approveSession(id);
      
      res.json({
        success: true,
        data: session,
        message: 'Session approved successfully',
      });
    } catch (error) {
      logger.error('Approve session error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'APPROVE_SESSION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to approve session',
        },
      });
    }
  };

  rejectSession = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await this.sessionService.rejectSession(id);
      
      res.json({
        success: true,
        data: session,
        message: 'Session rejected successfully',
      });
    } catch (error) {
      logger.error('Reject session error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REJECT_SESSION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reject session',
        },
      });
    }
  };

  endSession = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await this.sessionService.endSession(id);
      
      res.json({
        success: true,
        data: session,
        message: 'Session ended successfully',
      });
    } catch (error) {
      logger.error('End session error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'END_SESSION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to end session',
        },
      });
    }
  };

  getSessionLogs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const logs = await this.sessionService.getSessionLogs(id);
      
      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('Get session logs error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SESSION_LOGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get session logs',
        },
      });
    }
  };

  updateSession = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateSessionSchema.parse(req.body);
      const session = await this.sessionService.updateSession(id, data);
      
      res.json({
        success: true,
        data: session,
        message: 'Session updated successfully',
      });
    } catch (error) {
      logger.error('Update session error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_SESSION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update session',
        },
      });
    }
  };
}
