import { Request, Response } from 'express';
import { FileService } from './file.service';
import {
  uploadFileSchema,
  fileQuerySchema,
  fileSearchSchema,
} from './file.validator';
import { logger } from '../../config/logger';
import { upload, uploadSingle, uploadMultiple, uploadFields } from '../../config/multer';

export class FileController {
  private fileService: FileService;

  constructor() {
    this.fileService = FileService.getInstance();
  }

  uploadFile = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
        });
      }

      const data = uploadFileSchema.parse(req.body);
      const result = await this.fileService.uploadFile(adminId, file, data);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      logger.error('Upload file error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_FILE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload file',
        },
      });
    }
  };

  uploadMultipleFiles = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files uploaded',
          },
        });
      }

      const data = uploadFileSchema.parse(req.body);
      const results = await this.fileService.uploadMultipleFiles(adminId, files, data);
      
      res.status(201).json({
        success: true,
        data: results,
        message: 'Files uploaded successfully',
      });
    } catch (error) {
      logger.error('Upload multiple files error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_FILES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload files',
        },
      });
    }
  };

  getFiles = async (req: Request, res: Response) => {
    try {
      const query = fileQuerySchema.parse(req.query);
      const result = await this.fileService.getFiles(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get files error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_FILES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get files',
        },
      });
    }
  };

  getFileById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = await this.fileService.getFileById(id);
      
      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      logger.error('Get file by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: error instanceof Error ? error.message : 'File not found',
        },
      });
    }
  };

  downloadFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { fileStream, filename, mimeType } = await this.fileService.downloadFile(id);
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      fileStream.pipe(res);
    } catch (error) {
      logger.error('Download file error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FILE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to download file',
        },
      });
    }
  };

  deleteFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.fileService.deleteFile(id);
      
      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Delete file error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_FILE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete file',
        },
      });
    }
  };

  searchFiles = async (req: Request, res: Response) => {
    try {
      const data = fileSearchSchema.parse(req.body);
      const results = await this.fileService.searchFiles(data);
      
      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Search files error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'SEARCH_FILES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search files',
        },
      });
    }
  };

  getFileStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.fileService.getFileStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get file stats error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_FILE_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get file stats',
        },
      });
    }
  };
}
