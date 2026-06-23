import { Request, Response } from 'express';
import { LogsService } from './logs.service';
import { logsQuerySchema, exportLogsSchema } from './logs.validator';
import { logger } from '../../config/logger';

export class LogsController {
  private logsService: LogsService;

  constructor() {
    this.logsService = LogsService.getInstance();
  }

  getLogs = async (req: Request, res: Response) => {
    try {
      const query = logsQuerySchema.parse(req.query);
      const result = await this.logsService.getLogs(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get logs error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LOGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get logs',
        },
      });
    }
  };

  getLogTypes = async (req: Request, res: Response) => {
    try {
      const types = await this.logsService.getLogTypes();
      
      res.json({
        success: true,
        data: types,
      });
    } catch (error) {
      logger.error('Get log types error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LOG_TYPES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get log types',
        },
      });
    }
  };

  exportLogs = async (req: Request, res: Response) => {
    try {
      const data = exportLogsSchema.parse(req.body);
      const result = await this.logsService.exportLogs(data);
      
      res.json({
        success: true,
        data: result,
        message: 'Logs exported successfully',
      });
    } catch (error) {
      logger.error('Export logs error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'EXPORT_LOGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to export logs',
        },
      });
    }
  };

  clearLogs = async (req: Request, res: Response) => {
    try {
      const { type, olderThan } = req.body;
      const result = await this.logsService.clearLogs(type, olderThan);
      
      res.json({
        success: true,
        data: result,
        message: 'Logs cleared successfully',
      });
    } catch (error) {
      logger.error('Clear logs error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CLEAR_LOGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to clear logs',
        },
      });
    }
  };
}
