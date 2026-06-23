import { Router } from 'express';
import { TagController } from './tag.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createTagSchema, updateTagSchema, tagQuerySchema } from './tag.validator';

const router = Router();
const controller = new TagController();

router.use(authMiddleware);

router.get(
  '/',
  validate(tagQuerySchema, 'query'),
  checkPermission('device.read'),
  controller.getAllTags
);

router.get(
  '/:id',
  checkPermission('device.read'),
  controller.getTagById
);

router.post(
  '/',
  validate(createTagSchema),
  checkPermission('device.write'),
  controller.createTag
);

router.put(
  '/:id',
  validate(updateTagSchema),
  checkPermission('device.write'),
  controller.updateTag
);

router.delete(
  '/:id',
  checkPermission('device.delete'),
  controller.deleteTag
);

router.post(
  '/:tagId/devices/:deviceId',
  checkPermission('device.write'),
  controller.addDeviceToTag
);

router.delete(
  '/:tagId/devices/:deviceId',
  checkPermission('device.write'),
  controller.removeDeviceFromTag
);

export default router;
