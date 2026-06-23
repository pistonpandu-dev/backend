import { Router } from 'express';
import { LocationController } from './location.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  updateLocationSchema,
  locationQuerySchema,
  findDeviceSchema,
  lostModeSchema,
} from './location.validator';

const router = Router();
const controller = new LocationController();

router.use(authMiddleware);

router.post(
  '/update/:deviceId',
  validate(updateLocationSchema),
  checkPermission('location.write'),
  controller.updateLocation
);

router.get(
  '/live/:deviceId',
  checkPermission('location.read'),
  controller.getLiveLocation
);

router.get(
  '/history/:deviceId',
  validate(locationQuerySchema, 'query'),
  checkPermission('location.read'),
  controller.getLocationHistory
);

router.get(
  '/stats/:deviceId',
  checkPermission('location.read'),
  controller.getLocationStats
);

router.post(
  '/find-device',
  validate(findDeviceSchema),
  checkPermission('location.write'),
  controller.findDevice
);

router.post(
  '/lost-mode/:deviceId',
  validate(lostModeSchema),
  checkPermission('location.write'),
  controller.enableLostMode
);

router.delete(
  '/lost-mode/:deviceId',
  checkPermission('location.write'),
  controller.disableLostMode
);

export default router;
