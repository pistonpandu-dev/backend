import { Router } from 'express';
import { GroupController } from './group.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createGroupSchema, updateGroupSchema, groupQuerySchema } from './group.validator';

const router = Router();
const controller = new GroupController();

router.use(authMiddleware);

router.get(
  '/',
  validate(groupQuerySchema, 'query'),
  checkPermission('device.read'),
  controller.getAllGroups
);

router.get(
  '/:id',
  checkPermission('device.read'),
  controller.getGroupById
);

router.post(
  '/',
  validate(createGroupSchema),
  checkPermission('device.write'),
  controller.createGroup
);

router.put(
  '/:id',
  validate(updateGroupSchema),
  checkPermission('device.write'),
  controller.updateGroup
);

router.delete(
  '/:id',
  checkPermission('device.delete'),
  controller.deleteGroup
);

router.post(
  '/:groupId/devices/:deviceId',
  checkPermission('device.write'),
  controller.addDeviceToGroup
);

router.delete(
  '/:groupId/devices/:deviceId',
  checkPermission('device.write'),
  controller.removeDeviceFromGroup
);

export default router;
