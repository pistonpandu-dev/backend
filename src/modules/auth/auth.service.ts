import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { sendEmail } from '../../services/email.service';
import { SecurityAuditService } from '../security/audit.service';
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './auth.validator';
import { 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateToken,
} from '../../utils/auth.util';

export class AuthService {
  private static instance: AuthService;
  private auditService: SecurityAuditService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(loginDto: LoginDto, ipAddress: string, deviceName: string) {
    const { email, password, rememberMe } = loginDto;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      await this.auditService.logSecurityEvent({
        action: 'login_failed',
        module: 'auth',
        level: 'medium',
        description: 'Invalid login attempt',
        ipAddress,
        metadata: { email, reason: 'user_not_found' },
      });
      throw new Error('Invalid credentials');
    }

    if (!admin.isActive) {
      await this.auditService.logSecurityEvent({
        adminId: admin.id,
        action: 'login_failed',
        module: 'auth',
        level: 'high',
        description: 'Login attempt on disabled account',
        ipAddress,
        metadata: { email },
      });
      throw new Error('Account is disabled');
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new Error(`Account locked until ${admin.lockedUntil.toISOString()}`);
    }

    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          loginAttempts: { increment: 1 },
          ...(admin.loginAttempts + 1 >= 5 && {
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
          }),
        },
      });

      await this.auditService.logSecurityEvent({
        adminId: admin.id,
        action: 'login_failed',
        module: 'auth',
        level: 'medium',
        description: 'Invalid password',
        ipAddress,
        metadata: { email, attempts: admin.loginAttempts + 1 },
      });

      throw new Error('Invalid credentials');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    const accessToken = generateAccessToken(admin.id, admin.role);
    const refreshToken = generateRefreshToken(admin.id);

    const session = await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        deviceName,
        ipAddress,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      },
    });

    const redis = getRedisClient();
    await redis.setEx(
      `refresh_token:${admin.id}:${session.id}`,
      rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      refreshToken
    );

    await this.auditService.logSecurityEvent({
      adminId: admin.id,
      action: 'login_success',
      module: 'auth',
      level: 'info',
      description: 'Successful login',
      ipAddress,
      metadata: { deviceName, rememberMe },
    });

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        twoFactorEnabled: admin.twoFactorEnabled,
      },
      accessToken,
      refreshToken,
      sessionId: session.id,
      expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, role } = registerDto;

    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new Error('Admin already exists with this email');
    }

    const hashedPassword = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'operator',
        lastPasswordChange: new Date(),
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    await sendEmail({
      to: email,
      subject: 'Welcome to Rayan Admin',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Your admin account has been created successfully.</p>
        <p>Role: ${role || 'operator'}</p>
        <p>You can now login to the admin panel.</p>
        <a href="${process.env.FRONTEND_URL}">Go to Admin Panel</a>
      `,
    });

    await this.auditService.logSecurityEvent({
      adminId: admin.id,
      action: 'admin_registered',
      module: 'auth',
      level: 'info',
      description: 'New admin registration',
      metadata: { email, role: admin.role },
    });

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    const session = await prisma.adminSession.findFirst({
      where: {
        refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: {
        admin: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Invalid session');
    }

    if (!session.admin.isActive) {
      throw new Error('Account is disabled');
    }

    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    const newAccessToken = generateAccessToken(session.adminId, session.admin.role);
    const newRefreshToken = generateRefreshToken(session.adminId);

    await prisma.adminSession.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await redis.del(`refresh_token:${session.adminId}:${session.id}`);
    await redis.setEx(
      `refresh_token:${session.adminId}:${session.id}`,
      30 * 24 * 60 * 60,
      newRefreshToken
    );

    await this.auditService.logSecurityEvent({
      adminId: session.adminId,
      action: 'token_refreshed',
      module: 'auth',
      level: 'info',
      description: 'Token refresh',
      metadata: { sessionId: session.id },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(adminId: string, sessionId: string, token: string) {
    const redis = getRedisClient();
    await redis.setEx(`blacklist:${token}`, 900, 'true');
    await redis.del(`refresh_token:${adminId}:${sessionId}`);

    await prisma.adminSession.delete({
      where: { id: sessionId },
    });

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'logout',
      module: 'auth',
      level: 'info',
      description: 'User logged out',
      metadata: { sessionId },
    });
  }

  async logoutAll(adminId: string, currentSessionId: string) {
    const sessions = await prisma.adminSession.findMany({
      where: {
        adminId,
        id: { not: currentSessionId },
      },
    });

    const redis = getRedisClient();
    for (const session of sessions) {
      await redis.del(`refresh_token:${adminId}:${session.id}`);
      await redis.setEx(`blacklist:${session.accessToken}`, 900, 'true');
    }

    await prisma.adminSession.deleteMany({
      where: {
        adminId,
        id: { not: currentSessionId },
      },
    });

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'logout_all',
      module: 'auth',
      level: 'info',
      description: 'Logged out from all devices',
      metadata: { currentSessionId },
    });
  }

  async changePassword(adminId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    const isValidPassword = await comparePassword(currentPassword, admin.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.admin.update({
      where: { id: adminId },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'change_password',
      module: 'auth',
      level: 'info',
      description: 'Password changed successfully',
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    const resetToken = generateToken(32);
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    const redis = getRedisClient();
    await redis.setEx(
      `reset_token:${email}`,
      3600,
      JSON.stringify({ token: resetToken, expiry: resetTokenExpiry.toISOString() })
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Reset Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    await this.auditService.logSecurityEvent({
      adminId: admin.id,
      action: 'forgot_password',
      module: 'auth',
      level: 'info',
      description: 'Password reset requested',
      metadata: { email },
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, token, newPassword } = resetPasswordDto;

    const redis = getRedisClient();
    const storedData = await redis.get(`reset_token:${email}`);
    
    if (!storedData) {
      throw new Error('Invalid or expired reset token');
    }

    const { token: storedToken, expiry } = JSON.parse(storedData);
    
    if (storedToken !== token || new Date(expiry) < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.admin.update({
      where: { email },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    await redis.del(`reset_token:${email}`);

    await this.auditService.logSecurityEvent({
      adminId: admin.id,
      action: 'reset_password',
      module: 'auth',
      level: 'info',
      description: 'Password reset successfully',
      metadata: { email },
    });
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, token } = verifyEmailDto;

    const redis = getRedisClient();
    const storedToken = await redis.get(`verify_email:${email}`);

    if (!storedToken || storedToken !== token) {
      throw new Error('Invalid or expired verification token');
    }

    await prisma.admin.update({
      where: { email },
      data: {
        isActive: true,
      },
    });

    await redis.del(`verify_email:${email}`);
  }

  async getSessions(adminId: string) {
    const sessions = await prisma.adminSession.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  }

  async revokeSession(adminId: string, sessionId: string) {
    const session = await prisma.adminSession.findFirst({
      where: {
        id: sessionId,
        adminId,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const redis = getRedisClient();
    await redis.del(`refresh_token:${adminId}:${sessionId}`);
    await redis.setEx(`blacklist:${session.accessToken}`, 900, 'true');

    await prisma.adminSession.delete({
      where: { id: sessionId },
    });

    await this.auditService.logSecurityEvent({
      adminId,
      action: 'revoke_session',
      module: 'auth',
      level: 'info',
      description: 'Session revoked',
      metadata: { sessionId },
    });
  }
}
