import { fileRepository } from './file.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { storageService } from '../../services/storage.service';
import { logger } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import path from 'path';

export class FileService {
  private static instance: FileService;
  private auditService: SecurityAuditService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
  }

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  async uploadFile(adminId: string, file: Express.Multer.File, data: any) {
    const { deviceId, fileType, metadata } = data;

    // Check if device exists if deviceId is provided
    let device = null;
    if (deviceId) {
      device = await deviceRepository.findByDeviceId(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }
    }

    // Process image if it's an image
    let processedPath = file.path;
    if (file.mimetype.startsWith('image/')) {
      processedPath = await this.processImage(file);
    }

    // Save to database
    const savedFile = await fileRepository.create({
      deviceId: device?.id || null,
      adminId,
      fileName: file.originalname,
      fileSize: BigInt(file.size),
      fileType: fileType || file.mimetype,
      path: processedPath,
      mimeType: file.mimetype,
      metadata: {
        ...metadata,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'file_uploaded',
      module: 'files',
      level: 'info',
      description: `File ${file.originalname} uploaded`,
      metadata: { fileName: file.originalname, fileSize: file.size, deviceId },
    });

    return savedFile;
  }

  async uploadMultipleFiles(adminId: string, files: Express.Multer.File[], data: any) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadFile(adminId, file, data);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to upload file ${file.originalname}:`, error);
        results.push({
          file: file.originalname,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    return results;
  }

  async getFiles(query: any) {
    return await fileRepository.findAll(query);
  }

  async getFileById(id: string) {
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new Error('File not found');
    }
    return file;
  }

  async downloadFile(id: string) {
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new Error('File not found');
    }

    const fileStream = await storageService.getFileStream(file.path);
    
    return {
      fileStream,
      filename: file.fileName,
      mimeType: file.mimeType || 'application/octet-stream',
    };
  }

  async deleteFile(id: string) {
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new Error('File not found');
    }

    // Delete physical file
    await storageService.deleteFile(file.path);

    // Delete from database
    await fileRepository.delete(id);

    await this.auditService.logSecurityEvent({
      action: 'file_deleted',
      module: 'files',
      level: 'info',
      description: `File ${file.fileName} deleted`,
      metadata: { fileName: file.fileName, fileSize: file.fileSize },
    });
  }

  async searchFiles(data: any) {
    const { search, type, deviceId, fromDate, toDate } = data;
    return await fileRepository.search({
      search,
      type,
      deviceId,
      fromDate,
      toDate,
    });
  }

  async getFileStats() {
    return await fileRepository.getStats();
  }

  private async processImage(file: Express.Multer.File): Promise<string> {
    try {
      const processedPath = file.path.replace(/\.[^.]+$/, '_processed.jpg');
      
      await sharp(file.path)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(processedPath);

      // Remove original file
      await storageService.deleteFile(file.path);

      return processedPath;
    } catch (error) {
      logger.error('Image processing failed:', error);
      return file.path;
    }
  }
}
