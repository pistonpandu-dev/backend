import { Router } from 'express';
import { EnrollmentController } from './enrollment.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createEnrollmentSchema,
  updateEnrollmentSchema,
  enrollmentQuerySchema,
  approveEnrollmentSchema,
} from './enrollment.validator';

const router = Router();
const controller = new EnrollmentController();

// Public endpoint for device verification
router.post(
  '/verify/:deviceId/:pinCode',
  controller.verifyEnrollment
);

// Protected routes
router.use(authMiddleware);

router.get(
  '/',
  validate(enrollmentQuerySchema, 'query'),
  checkPermission('device.read'),
  controller.getAllEnrollments
);

router.get(
  '/:id',
  checkPermission('device.read'),
  controller.getEnrollmentById
);

router.post(
  '/',
  validate(createEnrollmentSchema),
  checkPermission('device.write'),
  controller.createEnrollment
);

router.put(
  '/:id',
  validate(updateEnrollmentSchema),
  checkPermission('device.write'),
  controller.updateEnrollment
);

router.delete(
  '/:id',
  checkPermission('device.delete'),
  controller.deleteEnrollment
);

router.post(
  '/:id/approve',
  validate(approveEnrollmentSchema),
  checkPermission('device.write'),
  controller.approveEnrollment
);

router.post(
  '/:id/reject',
  checkPermission('device.write'),
  controller.rejectEnrollment
);

export default router;
