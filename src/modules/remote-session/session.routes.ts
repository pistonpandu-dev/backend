import { Router } from 'express';
import { SessionController } from './session.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  requestSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
} from './session.validator';

const router = Router();
const controller = new SessionController();

router.use(authMiddleware);

router.get(
  '/',
  validate(sessionQuerySchema, 'query'),
  checkPermission('session.read'),
  controller.getAllSessions
);

router.get(
  '/:id',
  checkPermission('session.read'),
  controller.getSessionById
);

router.get(
  '/:id/logs',
  checkPermission('session.read'),
  controller.getSessionLogs
);

router.post(
  '/request',
  validate(requestSessionSchema),
  checkPermission('session.write'),
  controller.requestSession
);

router.post(
  '/:id/approve',
  checkPermission('session.write'),
  controller.approveSession
);

router.post(
  '/:id/reject',
  checkPermission('session.write'),
  controller.rejectSession
);

router.post(
  '/:id/end',
  checkPermission('session.write'),
  controller.endSession
);

router.put(
  '/:id',
  validate(updateSessionSchema),
  checkPermission('session.write'),
  controller.updateSession
);

export default router;
