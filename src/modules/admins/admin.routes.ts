import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAdminSchema,
  updateAdminSchema,
  adminQuerySchema,
} from './admin.validator';

const router = Router();
const controller = new AdminController();

router.use(authMiddleware);

router.get(
  '/',
  validate(adminQuerySchema, 'query'),
  checkPermission('admin.read'),
  controller.getAllAdmins
);

router.get(
  '/:id',
  checkPermission('admin.read'),
  controller.getAdminById
);

router.post(
  '/',
  validate(createAdminSchema),
  checkPermission('admin.write'),
  controller.createAdmin
);

router.put(
  '/:id',
  validate(updateAdminSchema),
  checkPermission('admin.write'),
  controller.updateAdmin
);

router.delete(
  '/:id',
  checkPermission('admin.delete'),
  controller.deleteAdmin
);

router.patch(
  '/:id/toggle-status',
  checkPermission('admin.write'),
  controller.toggleAdminStatus
);

export default router;
