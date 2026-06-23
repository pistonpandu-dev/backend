import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validator';

const router = Router();
const controller = new AuthController();

// Public routes
router.post('/login', validate(loginSchema), controller.login);
router.post('/register', validate(registerSchema), controller.register);
router.post('/refresh-token', validate(refreshTokenSchema), controller.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);

// Protected routes
router.post('/logout', authMiddleware, controller.logout);
router.post('/logout-all', authMiddleware, controller.logoutAll);
router.post('/change-password', authMiddleware, validate(changePasswordSchema), controller.changePassword);
router.get('/sessions', authMiddleware, controller.getSessions);
router.delete('/sessions/:sessionId', authMiddleware, controller.revokeSession);

export default router;
