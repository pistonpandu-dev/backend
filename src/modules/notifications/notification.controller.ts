import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import {
  createNotificationSchema,
  notificationQuerySchema,
  markReadSchema,
} from './notification.validator';
import { logger } from '../../config/logger';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  getNotifications = async (req: Request, res: Response) => {
    try {
      const query = notificationQuerySchema.parse(req.query);
      const result = await this.notificationService.getNotifications(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_NOTIFICATIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get notifications',
        },
      });
    }
  };

  getNotificationById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.getNotificationById(id);
      
      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      logger.error('Get notification by id error:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Notification not found',
        },
      });
    }
  };

  createNotification = async (req: Request, res: Response) => {
    try {
      const data = createNotificationSchema.parse(req.body);
      const notification = await this.notificationService.createNotification(data);
      
      res.status(201).json({
        success: true,
        data: notification,
        message: 'Notification created successfully',
      });
    } catch (error) {
      logger.error('Create notification error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_NOTIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create notification',
        },
      });
    }
  };

  markAsRead = async (req: Request, res: Response) => {
    try {
      const data = markReadSchema.parse(req.body);
      const { ids } = data;
      
      if (ids && ids.length > 0) {
        await this.notificationService.markManyAsRead(ids);
      } else {
        const { id } = req.params;
        await this.notificationService.markAsRead(id);
      }
      
      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      logger.error('Mark as read error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'MARK_READ_FAILED',
          message: error instanceof Error ? error.message : 'Failed to mark as read',
        },
      });
    }
  };

  markAllAsRead = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      await this.notificationService.markAllAsRead(adminId);
      
      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      logger.error('Mark all as read error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'MARK_ALL_READ_FAILED',
          message: error instanceof Error ? error.message : 'Failed to mark all as read',
        },
      });
    }
  };

  deleteNotification = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.notificationService.deleteNotification(id);
      
      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      logger.error('Delete notification error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_NOTIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete notification',
        },
      });
    }
  };

  getUnreadCount = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      const count = await this.notificationService.getUnreadCount(adminId);
      
      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      logger.error('Get unread count error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_UNREAD_COUNT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get unread count',
        },
      });
    }
  };

  sendTestNotification = async (req: Request, res: Response) => {
    try {
      const { type, deviceId } = req.body;
      const adminId = req.user.id;
      
      const result = await this.notificationService.sendTestNotification(adminId, deviceId, type);
      
      res.json({
        success: true,
        data: result,
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      logger.error('Send test notification error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'SEND_TEST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to send test notification',
        },
      });
    }
  };
        }
