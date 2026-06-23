import { Router } from 'express';
import { StatisticsController } from './statistics.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';

const router = Router();
const controller = new StatisticsController();

router.use(authMiddleware);

router.get(
  '/overall',
  checkPermission('dashboard.read'),
  controller.getOverallStatistics
);

router.get(
  '/devices',
  checkPermission('dashboard.read'),
  controller.getDeviceStatistics
);

router.get(
  '/monitoring',
  checkPermission('dashboard.read'),
  controller.getMonitoringStatistics
);

router.get(
  '/location',
  checkPermission('dashboard.read'),
  controller.getLocationStatistics
);

router.get(
  '/security',
  checkPermission('dashboard.read'),
  controller.getSecurityStatistics
);

router.get(
  '/usage',
  checkPermission('dashboard.read'),
  controller.getUsageStatistics
);

export default router;
