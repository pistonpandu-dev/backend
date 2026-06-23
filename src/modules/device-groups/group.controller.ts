import { Request, Response } from 'express';
import { GroupService } from './group.service';
import { createGroupSchema, updateGroupSchema, groupQuerySchema } from './group.validator';
import { logger } from '../../config/logger';

export class GroupController {
  private groupService: GroupService;

  constructor() {
    this.groupService = GroupService.getInstance();
  }

  getAllGroups = async (req: Request, res: Response) => {
    try {
      const query = groupQuerySchema.parse(req.query);
      const result = await this.groupService.getAllGroups(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all groups error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_GROUPS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get groups',
        },
      });
    }
  };

  getGroupById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const group = await this.groupService.getGroupById(id);
      
      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      logger.error('Get group by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Group not found',
        },
      });
    }
  };

  createGroup = async (req: Request, res: Response) => {
    try {
      const data = createGroupSchema.parse(req.body);
      const group = await this.groupService.createGroup(data);
      
      res.status(201).json({
        success: true,
        data: group,
        message: 'Group created successfully',
      });
    } catch (error) {
      logger.error('Create group error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_GROUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create group',
        },
      });
    }
  };

  updateGroup = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateGroupSchema.parse(req.body);
      const group = await this.groupService.updateGroup(id, data);
      
      res.json({
        success: true,
        data: group,
        message: 'Group updated successfully',
      });
    } catch (error) {
      logger.error('Update group error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_GROUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update group',
        },
      });
    }
  };

  deleteGroup = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.groupService.deleteGroup(id);
      
      res.json({
        success: true,
        message: 'Group deleted successfully',
      });
    } catch (error) {
      logger.error('Delete group error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_GROUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete group',
        },
      });
    }
  };

  addDeviceToGroup = async (req: Request, res: Response) => {
    try {
      const { groupId, deviceId } = req.params;
      const result = await this.groupService.addDeviceToGroup(groupId, deviceId);
      
      res.json({
        success: true,
        data: result,
        message: 'Device added to group successfully',
      });
    } catch (error) {
      logger.error('Add device to group error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'ADD_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to add device to group',
        },
      });
    }
  };

  removeDeviceFromGroup = async (req: Request, res: Response) => {
    try {
      const { groupId, deviceId } = req.params;
      await this.groupService.removeDeviceFromGroup(groupId, deviceId);
      
      res.json({
        success: true,
        message: 'Device removed from group successfully',
      });
    } catch (error) {
      logger.error('Remove device from group error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REMOVE_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to remove device from group',
        },
      });
    }
  };
}
