import { screenRepository } from './screen.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { storageService } from '../../services/storage.service';
import { logger } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class ScreenService {
  private static instance: ScreenService;
  private auditService: SecurityAuditService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
  }

  static getInstance(): ScreenService {
    if (!ScreenService.instance) {
      ScreenService.instance = new ScreenService();
    }
    return ScreenService.instance;
  }

  async captureScreenshot(adminId: string, data: any) {
    const { deviceId, screenshotData, metadata } = data;

    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Generate unique filename
    const filename = `screenshot_${deviceId}_${Date.now()}.png`;
    const path = `screenshots/${filename}`;

    // Save file
    await storageService.saveFile(path, screenshotData);

    // Save to database
    const screenshot = await screenRepository.createScreenshot({
      deviceId: device.id,
      adminId,
      screenshotUrl: path,
      metadata: {
        ...metadata,
        capturedAt: new Date().toISOString(),
      },
    });

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'screenshot_captured',
      module: 'screens',
      level: 'info',
      description: `Screenshot captured for device ${deviceId}`,
      metadata: { deviceId, screenshotId: screenshot.id },
    });

    return screenshot;
  }

  async startRecording(adminId: string, data: any) {
    const { deviceId, duration, quality } = data;

    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Generate unique filename
    const filename = `recording_${deviceId}_${Date.now()}.mp4`;
    const path = `recordings/${filename}`;

    // Start recording (this would trigger the actual recording process)
    const recording = await screenRepository.createRecording({
      deviceId: device.id,
      adminId,
      recordingUrl: path,
      duration,
      quality: quality || 'medium',
      startedAt: new Date(),
      status: 'recording',
    });

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'recording_started',
      module: 'screens',
      level: 'high',
      description: `Recording started for device ${deviceId}`,
      metadata: { deviceId, recordingId: recording.id },
    });

    return recording;
  }

  async stopRecording(id: string) {
    const recording = await screenRepository.findRecordingById(id);
    if (!recording) {
      throw new Error('Recording not found');
    }

    // Stop the actual recording process
    const stopped = await screenRepository.updateRecording(id, {
      status: 'completed',
      endedAt: new Date(),
    });

    await this.auditService.logSecurityEvent({
      adminId: recording.adminId,
      action: 'recording_stopped',
      module: 'screens',
      level: 'info',
      description: `Recording ${id} stopped`,
      metadata: { recordingId: id },
    });

    return stopped;
  }

  async getScreenshots(query: any) {
    return await screenRepository.getScreenshots(query);
  }

  async getRecordings(query: any) {
    return await screenRepository.getRecordings(query);
  }

  async deleteScreenshot(id: string) {
    const screenshot = await screenRepository.findScreenshotById(id);
    if (!screenshot) {
      throw new Error('Screenshot not found');
    }

    // Delete file
    await storageService.deleteFile(screenshot.screenshotUrl);

    await screenRepository.deleteScreenshot(id);

    await this.auditService.logSecurityEvent({
      action: 'screenshot_deleted',
      module: 'screens',
      level: 'info',
      description: `Screenshot ${id} deleted`,
      metadata: { screenshotId: id },
    });
  }

  async deleteRecording(id: string) {
    const recording = await screenRepository.findRecordingById(id);
    if (!recording) {
      throw new Error('Recording not found');
    }

    // Delete file
    await storageService.deleteFile(recording.recordingUrl);

    await screenRepository.deleteRecording(id);

    await this.auditService.logSecurityEvent({
      action: 'recording_deleted',
      module: 'screens',
      level: 'info',
      description: `Recording ${id} deleted`,
      metadata: { recordingId: id },
    });
  }
}
