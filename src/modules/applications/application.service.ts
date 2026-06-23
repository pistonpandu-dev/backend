import { applicationRepository } from './application.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { logger } from '../../config/logger';

export class ApplicationService {
  private static instance: ApplicationService;
  private auditService: SecurityAuditService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
  }

  static getInstance(): ApplicationService {
    if (!ApplicationService.instance) {
      ApplicationService.instance = new ApplicationService();
    }
    return ApplicationService.instance;
  }

  async getApplications(deviceId: string, query: any) {
    const { search, page = 1, limit = 20 } = query;

    // Check if device exists
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    return await applicationRepository.findAll(device.id, { search, page, limit });
  }

  async syncApplications(deviceId: string, data: any) {
    const { applications } = data;

    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Get existing applications
    const existingApps = await applicationRepository.findByDevice(device.id);
    const existingMap = new Map(
      existingApps.map(app => [app.packageName, app])
    );

    const results = {
      added: 0,
      updated: 0,
      removed: 0,
      total: applications.length,
    };

    // Process each application
    for (const appData of applications) {
      const existing = existingMap.get(appData.packageName);

      if (existing) {
        // Update if version changed
        if (existing.version !== appData.version) {
          await applicationRepository.update(existing.id, {
            version: appData.version,
            updatedAt: new Date(),
          });
          results.updated++;
        }
        existingMap.delete(appData.packageName);
      } else {
        // Add new application
        await applicationRepository.create({
          deviceId: device.id,
          packageName: appData.packageName,
          appName: appData.appName,
          version: appData.version,
          installedAt: appData.installedAt || new Date(),
        });
        results.added++;
      }
    }

    // Remove applications that are no longer installed
    for (const [packageName, app] of existingMap) {
      await applicationRepository.delete(app.id);
      results.removed++;
    }

    await this.auditService.logSecurityEvent({
      action: 'applications_synced',
      module: 'applications',
      level: 'info',
      description: `Applications synced for device ${deviceId}`,
      metadata: {
        deviceId,
        added: results.added,
        updated: results.updated,
        removed: results.removed,
        total: results.total,
      },
    });

    return results;
  }

  async getApplicationStats(deviceId: string) {
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    return await applicationRepository.getStats(device.id);
  }

  async searchApplications(deviceId: string, searchTerm: string) {
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    return await applicationRepository.search(device.id, searchTerm);
  }
}
