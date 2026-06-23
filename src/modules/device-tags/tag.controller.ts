import { Request, Response } from 'express';
import { TagService } from './tag.service';
import { createTagSchema, updateTagSchema, tagQuerySchema } from './tag.validator';
import { logger } from '../../config/logger';

export class TagController {
  private tagService: TagService;

  constructor() {
    this.tagService = TagService.getInstance();
  }

  getAllTags = async (req: Request, res: Response) => {
    try {
      const query = tagQuerySchema.parse(req.query);
      const result = await this.tagService.getAllTags(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all tags error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_TAGS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get tags',
        },
      });
    }
  };

  getTagById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tag = await this.tagService.getTagById(id);
      
      res.json({
        success: true,
        data: tag,
      });
    } catch (error) {
      logger.error('Get tag by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'TAG_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Tag not found',
        },
      });
    }
  };

  createTag = async (req: Request, res: Response) => {
    try {
      const data = createTagSchema.parse(req.body);
      const tag = await this.tagService.createTag(data);
      
      res.status(201).json({
        success: true,
        data: tag,
        message: 'Tag created successfully',
      });
    } catch (error) {
      logger.error('Create tag error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_TAG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create tag',
        },
      });
    }
  };

  updateTag = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateTagSchema.parse(req.body);
      const tag = await this.tagService.updateTag(id, data);
      
      res.json({
        success: true,
        data: tag,
        message: 'Tag updated successfully',
      });
    } catch (error) {
      logger.error('Update tag error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_TAG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update tag',
        },
      });
    }
  };

  deleteTag = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.tagService.deleteTag(id);
      
      res.json({
        success: true,
        message: 'Tag deleted successfully',
      });
    } catch (error) {
      logger.error('Delete tag error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_TAG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete tag',
        },
      });
    }
  };

  addDeviceToTag = async (req: Request, res: Response) => {
    try {
      const { tagId, deviceId } = req.params;
      const result = await this.tagService.addDeviceToTag(tagId, deviceId);
      
      res.json({
        success: true,
        data: result,
        message: 'Device added to tag successfully',
      });
    } catch (error) {
      logger.error('Add device to tag error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'ADD_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to add device to tag',
        },
      });
    }
  };

  removeDeviceFromTag = async (req: Request, res: Response) => {
    try {
      const { tagId, deviceId } = req.params;
      await this.tagService.removeDeviceFromTag(tagId, deviceId);
      
      res.json({
        success: true,
        message: 'Device removed from tag successfully',
      });
    } catch (error) {
      logger.error('Remove device from tag error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REMOVE_DEVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to remove device from tag',
        },
      });
    }
  };
        }
