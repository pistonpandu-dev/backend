import { Router } from 'express';
import { GeofenceController } from './geofence.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createGeofenceSchema,
  updateGeofenceSchema,
  geofenceQuerySchema,
  geofenceEventSchema,
} from './geofence.validator';

const router = Router();
const controller = new GeofenceController();

router.use(authMiddleware);

router.get(
  '/',
  validate(geofenceQuerySchema, 'query'),
  checkPermission('location.read'),
  controller.getAllGeofences
);

router.get(
  '/:id',
  checkPermission('location.read'),
  controller.getGeofenceById
);

router.get(
  '/:id/logs',
  validate(geofenceQuerySchema, 'query'),
  checkPermission('location.read'),
  controller.getGeofenceLogs
);

router.post(
  '/',
  validate(createGeofenceSchema),
  checkPermission('location.write'),
  controller.createGeofence
);

router.put(
  '/:id',
  validate(updateGeofenceSchema),
  checkPermission('location.write'),
  controller.updateGeofence
);

router.delete(
  '/:id',
  checkPermission('location.delete'),
  controller.deleteGeofence
);

router.patch(
  '/:id/toggle',
  checkPermission('location.write'),
  controller.toggleGeofence
);

router.post(
  '/:id/event',
  validate(geofenceEventSchema),
  checkPermission('location.write'),
  controller.triggerGeofenceEvent
);

export default router;
