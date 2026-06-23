import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';

// Import all module routes
import authRoutes from '../modules/auth/auth.routes';
import adminRoutes from '../modules/admins/admin.routes';
import deviceRoutes from '../modules/devices/device.routes';
import groupRoutes from '../modules/device-groups/group.routes';
import tagRoutes from '../modules/device-tags/tag.routes';
import enrollmentRoutes from '../modules/enrollments/enrollment.routes';
import monitoringRoutes from '../modules/monitoring/monitoring.routes';
import locationRoutes from '../modules/locations/location.routes';
import geofenceRoutes from '../modules/geofence/geofence.routes';
import applicationRoutes from '../modules/applications/application.routes';
import sessionRoutes from '../modules/remote-session/session.routes';
import screenRoutes from '../modules/screens/screen.routes';
import fileRoutes from '../modules/files/file.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import statisticsRoutes from '../modules/statistics/statistics.routes';
import securityRoutes from '../modules/security/security.routes';
import logsRoutes from '../modules/logs/logs.routes';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes (require authentication)
router.use('/admins', authMiddleware, adminRoutes);
router.use('/devices', authMiddleware, deviceRoutes);
router.use('/groups', authMiddleware, groupRoutes);
router.use('/tags', authMiddleware, tagRoutes);
router.use('/enrollments', authMiddleware, enrollmentRoutes);
router.use('/monitoring', authMiddleware, monitoringRoutes);
router.use('/locations', authMiddleware, locationRoutes);
router.use('/geofences', authMiddleware, geofenceRoutes);
router.use('/applications', authMiddleware, applicationRoutes);
router.use('/sessions', authMiddleware, sessionRoutes);
router.use('/screens', authMiddleware, screenRoutes);
router.use('/files', authMiddleware, fileRoutes);
router.use('/notifications', authMiddleware, notificationRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);
router.use('/statistics', authMiddleware, statisticsRoutes);
router.use('/security', authMiddleware, securityRoutes);
router.use('/logs', authMiddleware, logsRoutes);

export { router as apiRoutes };
