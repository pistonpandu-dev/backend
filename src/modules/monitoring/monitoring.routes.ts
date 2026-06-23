import { Router } from 'express';
import { MonitoringController } from './monitoring.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createMonitoringSchema,
  monitoringQuerySchema,
} from './monitoring.validator';

const router = Router();
const controller = new MonitoringController();

router.use(authMiddleware);

router.get(
  '/:deviceId',
  validate(monitoringQuerySchema, 'query'),
  checkPermission('device.read'),
  controller.getMonitoringData
);

router.get(
  '/:deviceId/realtime',
  checkPermission('device.read'),
  controller.getRealtimeMonitoring
);

router.get(
  '/:deviceId/stats',
  checkPermission('device.read'),
  controller.getMonitoringStats
);

router.get(
  '/:deviceId/health',
  checkPermission('device.read'),
  controller.getDeviceHealth
);

router.get(
  '/:deviceId/anomalies',
  checkPermission('security.read'),
  controller.getAnomalies
);

router.post(
  '/:deviceId',
  validate(createMonitoringSchema),
  checkPermission('device.write'),
  controller.createMonitoring
);

export default router;
