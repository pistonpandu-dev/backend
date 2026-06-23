import { Router } from 'express';
import { LogsController } from './logs.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { logsQuerySchema, exportLogsSchema } from './logs.validator';

const router = Router();
const controller = new LogsController();

router.use(authMiddleware);

router.get(
  '/',
  validate(logsQuerySchema, 'query'),
  checkPermission('audit.read'),
  controller.getLogs
);

router.get(
  '/types',
  checkPermission('audit.read'),
  controller.getLogTypes
);

router.post(
  '/export',
  validate(exportLogsSchema),
  checkPermission('audit.read'),
  controller.exportLogs
);

router.delete(
  '/clear',
  checkPermission('audit.write'),
  controller.clearLogs
);

export default router;
