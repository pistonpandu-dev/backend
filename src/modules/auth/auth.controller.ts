import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validator';
import { logger } from '../../config/logger';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  login = async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await this.authService.login(data, ipAddress, userAgent);

      res.json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error instanceof Error ? error.message : 'Login failed',
        },
      });
    }
  };

  register = async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await this.authService.register(data);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful',
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: error instanceof Error ? error.message : 'Registration failed',
        },
      });
    }
  };

  refreshToken = async (req: Request, res: Response) => {
    try {
      const data = refreshTokenSchema.parse(req.body);
      const result = await this.authService.refreshToken(data);

      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to refresh token',
        },
      });
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      const sessionId = req.sessionId;
      const token = req.token;

      await this.authService.logout(adminId, sessionId, token);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to logout',
        },
      });
    }
  };

  logoutAll = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      const sessionId = req.sessionId;

      await this.authService.logoutAll(adminId, sessionId);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'LOGOUT_ALL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to logout from all devices',
        },
      });
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      const data = changePasswordSchema.parse(req.body);
      const adminId = req.user.id;

      await this.authService.changePassword(adminId, data);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CHANGE_PASSWORD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to change password',
        },
      });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      await this.authService.forgotPassword(data);

      res.json({
        success: true,
        message: 'Password reset link sent to your email',
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'FORGOT_PASSWORD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to process forgot password',
        },
      });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      await this.authService.resetPassword(data);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'RESET_PASSWORD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reset password',
        },
      });
    }
  };

  verifyEmail = async (req: Request, res: Response) => {
    try {
      const data = verifyEmailSchema.parse(req.body);
      await this.authService.verifyEmail(data);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Verify email error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'VERIFY_EMAIL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to verify email',
        },
      });
    }
  };

  getSessions = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      const sessions = await this.authService.getSessions(adminId);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      logger.error('Get sessions error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_SESSIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get sessions',
        },
      });
    }
  };

  revokeSession = async (req: Request, res: Response) => {
    try {
      const adminId = req.user.id;
      const { sessionId } = req.params;

      await this.authService.revokeSession(adminId, sessionId);

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      logger.error('Revoke session error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REVOKE_SESSION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to revoke session',
        },
      });
    }
  };
}
