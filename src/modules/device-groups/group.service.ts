import { groupRepository } from './group.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { logger } from '../../config/logger';

export class GroupService {
  private static instance: GroupService;
  private auditService: SecurityAuditService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
  }

  static getInstance(): GroupService {
    if (!GroupService.instance) {
      GroupService.instance = new GroupService();
    }
    return GroupService.instance;
  }

  async getAllGroups(query: any) {
    return await groupRepository.findAll(query);
  }

  async getGroupById(id: string) {
    const group = await groupRepository.findById(id);
    if (!group) {
      throw new Error('Group not found');
    }
    return group;
  }

  async createGroup(data: any) {
    const existing = await groupRepository.findByName(data.name);
    if (existing) {
      throw new Error('Group with this name already exists');
    }

    const group = await groupRepository.create(data);

    await this.auditService.logSecurityEvent({
      action: 'group_created',
      module: 'device-groups',
      level: 'info',
      description: `Group ${data.name} created`,
      metadata: { name: data.name },
    });

    return group;
  }

  async updateGroup(id: string, data: any) {
    const group = await groupRepository.findById(id);
    if (!group) {
      throw new Error('Group not found');
    }

    if (data.name && data.name !== group.name) {
      const existing = await groupRepository.findByName(data.name);
      if (existing) {
        throw new Error('Group with this name already exists');
      }
    }

    const updated = await groupRepository.update(id, data);

    await this.auditService.logSecurityEvent({
      action: 'group_updated',
      module: 'device-groups',
      level: 'info',
      description: `Group ${group.name} updated`,
      metadata: { name: group.name, updatedFields: Object.keys(data) },
    });

    return updated;
  }

  async deleteGroup(id: string) {
    const group = await groupRepository.findById(id);
    if (!group) {
      throw new Error('Group not found');
    }

    await groupRepository.delete(id);

    await this.auditService.logSecurityEvent({
      action: 'group_deleted',
      module: 'device-groups',
      level: 'high',
      description: `Group ${group.name} deleted`,
      metadata: { name: group.name },
    });
  }

  async addDeviceToGroup(groupId: string, deviceId: string) {
    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const result = await groupRepository.addDevice(groupId, deviceId);

    await this.auditService.logSecurityEvent({
      action: 'device_added_to_group',
      module: 'device-groups',
      level: 'info',
      description: `Device ${device.deviceId} added to group ${group.name}`,
      metadata: { deviceId: device.deviceId, groupId: group.id },
    });

    return result;
  }

  async removeDeviceFromGroup(groupId: string, deviceId: string) {
    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    await groupRepository.removeDevice(groupId, deviceId);

    await this.auditService.logSecurityEvent({
      action: 'device_removed_from_group',
      module: 'device-groups',
      level: 'info',
      description: `Device ${device.deviceId} removed from group ${group.name}`,
      metadata: { deviceId: device.deviceId, groupId: group.id },
    });
  }
}
