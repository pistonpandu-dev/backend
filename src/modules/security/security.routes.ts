import { Router } from 'express';
import { SecurityController } from './security.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  securityAlertQuerySchema,
  auditLogQuerySchema,
  resolveAlertSchema,
} from './security.validator';

const router = Router();
const controller = new SecurityController();

router.use(authMiddleware);

router.get(
  '/alerts',
  validate(securityAlertQuerySchema, 'query'),
  checkPermission('security.read'),
  controller.getSecurityAlerts
);

router.get(
  '/alerts/:id',
  checkPermission('security.read'),
  controller.getSecurityAlertById
);

router.get(
  '/audit-logs',
  validate(auditLogQuerySchema, 'query'),
  checkPermission('audit.read'),
  controller.getAuditLogs
);

router.get(
  '/stats',
  checkPermission('security.read'),
  controller.getSecurityStats
);

router.post(
  '/alerts/:id/resolve',
  validate(resolveAlertSchema),
  checkPermission('security.write'),
  controller.resolveAlert
);

router.post(
  '/check-suspicious',
  checkPermission('security.write'),
  controller.checkSuspiciousActivity
);

router.post(
  '/block-ip',
  checkPermission('security.write'),
  controller.blockIP
);

router.delete(
  '/unblock-ip/:ip',
  checkPermission('security.write'),
  controller.unblockIP
);

export default router;
