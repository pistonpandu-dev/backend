import { tagRepository } from './tag.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { logger } from '../../config/logger';

export class TagService {
  private static instance: TagService;
  private auditService: SecurityAuditService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
  }

  static getInstance(): TagService {
    if (!TagService.instance) {
      TagService.instance = new TagService();
    }
    return TagService.instance;
  }

  async getAllTags(query: any) {
    return await tagRepository.findAll(query);
  }

  async getTagById(id: string) {
    const tag = await tagRepository.findById(id);
    if (!tag) {
      throw new Error('Tag not found');
    }
    return tag;
  }

  async createTag(data: any) {
    const existing = await tagRepository.findByName(data.name);
    if (existing) {
      throw new Error('Tag with this name already exists');
    }

    const tag = await tagRepository.create(data);

    await this.auditService.logSecurityEvent({
      action: 'tag_created',
      module: 'device-tags',
      level: 'info',
      description: `Tag ${data.name} created`,
      metadata: { name: data.name, color: data.color },
    });

    return tag;
  }

  async updateTag(id: string, data: any) {
    const tag = await tagRepository.findById(id);
    if (!tag) {
      throw new Error('Tag not found');
    }

    if (data.name && data.name !== tag.name) {
      const existing = await tagRepository.findByName(data.name);
      if (existing) {
        throw new Error('Tag with this name already exists');
      }
    }

    const updated = await tagRepository.update(id, data);

    await this.auditService.logSecurityEvent({
      action: 'tag_updated',
      module: 'device-tags',
      level: 'info',
      description: `Tag ${tag.name} updated`,
      metadata: { name: tag.name, updatedFields: Object.keys(data) },
    });

    return updated;
  }

  async deleteTag(id: string) {
    const tag = await tagRepository.findById(id);
    if (!tag) {
      throw new Error('Tag not found');
    }

    await tagRepository.delete(id);

    await this.auditService.logSecurityEvent({
      action: 'tag_deleted',
      module: 'device-tags',
      level: 'high',
      description: `Tag ${tag.name} deleted`,
      metadata: { name: tag.name },
    });
  }

  async addDeviceToTag(tagId: string, deviceId: string) {
    const tag = await tagRepository.findById(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }

    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const result = await tagRepository.addDevice(tagId, deviceId);

    await this.auditService.logSecurityEvent({
      action: 'device_added_to_tag',
      module: 'device-tags',
      level: 'info',
      description: `Device ${device.deviceId} added to tag ${tag.name}`,
      metadata: { deviceId: device.deviceId, tagId: tag.id },
    });

    return result;
  }

  async removeDeviceFromTag(tagId: string, deviceId: string) {
    const tag = await tagRepository.findById(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }

    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    await tagRepository.removeDevice(tagId, deviceId);

    await this.auditService.logSecurityEvent({
      action: 'device_removed_from_tag',
      module: 'device-tags',
      level: 'info',
      description: `Device ${device.deviceId} removed from tag ${tag.name}`,
      metadata: { deviceId: device.deviceId, tagId: tag.id },
    });
  }
}
