import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';

const router = Router();
const controller = new DashboardController();

router.use(authMiddleware);

router.get(
  '/stats',
  checkPermission('dashboard.read'),
  controller.getDashboardStats
);

router.get(
  '/analytics',
  checkPermission('dashboard.read'),
  controller.getDeviceAnalytics
);

router.get(
  '/security',
  checkPermission('dashboard.read'),
  controller.getSecurityOverview
);

router.get(
  '/activity',
  checkPermission('dashboard.read'),
  controller.getActivityFeed
);

router.get(
  '/heatmap',
  checkPermission('dashboard.read'),
  controller.getLocationHeatmap
);

export default router;
