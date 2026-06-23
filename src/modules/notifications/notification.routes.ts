import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createNotificationSchema,
  notificationQuerySchema,
  markReadSchema,
} from './notification.validator';

const router = Router();
const controller = new NotificationController();

router.use(authMiddleware);

router.get(
  '/',
  validate(notificationQuerySchema, 'query'),
  checkPermission('device.read'),
  controller.getNotifications
);

router.get(
  '/unread-count',
  checkPermission('device.read'),
  controller.getUnreadCount
);

router.get(
  '/:id',
  checkPermission('device.read'),
  controller.getNotificationById
);

router.post(
  '/',
  validate(createNotificationSchema),
  checkPermission('device.write'),
  controller.createNotification
);

router.post(
  '/test',
  checkPermission('device.write'),
  controller.sendTestNotification
);

router.put(
  '/:id/read',
  checkPermission('device.write'),
  controller.markAsRead
);

router.put(
  '/read-all',
  checkPermission('device.write'),
  controller.markAllAsRead
);

router.delete(
  '/:id',
  checkPermission('device.delete'),
  controller.deleteNotification
);

export default router;
