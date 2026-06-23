import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { syncApplicationsSchema, applicationQuerySchema } from './application.validator';

const router = Router();
const controller = new ApplicationController();

router.use(authMiddleware);

router.get(
  '/:deviceId',
  validate(applicationQuerySchema, 'query'),
  checkPermission('device.read'),
  controller.getApplications
);

router.get(
  '/:deviceId/search',
  checkPermission('device.read'),
  controller.searchApplications
);

router.get(
  '/:deviceId/stats',
  checkPermission('device.read'),
  controller.getApplicationStats
);

router.post(
  '/:deviceId/sync',
  validate(syncApplicationsSchema),
  checkPermission('device.write'),
  controller.syncApplications
);

export default router;
