import { Router } from 'express';
import { ScreenController } from './screen.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  captureScreenshotSchema,
  startRecordingSchema,
  screenQuerySchema,
} from './screen.validator';

const router = Router();
const controller = new ScreenController();

router.use(authMiddleware);

router.get(
  '/screenshots',
  validate(screenQuerySchema, 'query'),
  checkPermission('session.read'),
  controller.getScreenshots
);

router.get(
  '/recordings',
  validate(screenQuerySchema, 'query'),
  checkPermission('session.read'),
  controller.getRecordings
);

router.post(
  '/screenshot',
  validate(captureScreenshotSchema),
  checkPermission('session.write'),
  controller.captureScreenshot
);

router.post(
  '/recording/start',
  validate(startRecordingSchema),
  checkPermission('session.write'),
  controller.startRecording
);

router.post(
  '/recording/:id/stop',
  checkPermission('session.write'),
  controller.stopRecording
);

router.delete(
  '/screenshot/:id',
  checkPermission('session.delete'),
  controller.deleteScreenshot
);

router.delete(
  '/recording/:id',
  checkPermission('session.delete'),
  controller.deleteRecording
);

export default router;
