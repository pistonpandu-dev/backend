import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { sendEmail } from '../../services/email.service';
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto 
} from './auth.validator';
import { 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword 
} from '../../utils/auth.util';

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(loginDto: LoginDto, ipAddress: string, deviceName: string) {
    const { email, password, rememberMe } = loginDto;

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new Error('Invalid credentials');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken(admin.id, admin.role);
    const refreshToken = generateRefreshToken(admin.id);

    // Save session
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

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Store refresh token in Redis
    const redis = getRedisClient();
    await redis.setEx(
      `refresh_token:${admin.id}:${session.id}`,
      rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      refreshToken
    );

    // Log audit
    await this.logAudit(admin.id, 'login', 'auth', ipAddress, {
      deviceName,
      rememberMe,
    });

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
      },
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Find session
    const session = await prisma.adminSession.findFirst({
      where: {
        refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: {
        admin: true,
      },
    });

    if (!session) {
      throw new Error('Invalid session');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(session.adminId, session.admin.role);
    const newRefreshToken = generateRefreshToken(session.adminId);

    // Update session
    await prisma.adminSession.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update Redis
    const redis = getRedisClient();
    await redis.del(`refresh_token:${session.adminId}:${session.id}`);
    await redis.setEx(
      `refresh_token:${session.adminId}:${session.id}`,
      30 * 24 * 60 * 60,
      newRefreshToken
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(adminId: string, sessionId: string) {
    // Delete session
    await prisma.adminSession.delete({
      where: { id: sessionId },
    });

    // Remove from Redis
    const redis = getRedisClient();
    await redis.del(`refresh_token:${adminId}:${sessionId}`);

    // Log audit
    await this.logAudit(adminId, 'logout', 'auth', '', {});

    return { success: true };
  }

  async logoutAll(adminId: string, currentSessionId: string) {
    // Delete all sessions except current
    await prisma.adminSession.deleteMany({
      where: {
        adminId,
        id: { not: currentSessionId },
      },
    });

    // Remove all Redis tokens except current
    const redis = getRedisClient();
    const keys = await redis.keys(`refresh_token:${adminId}:*`);
    for (const key of keys) {
      if (!key.includes(currentSessionId)) {
        await redis.del(key);
      }
    }

    // Log audit
    await this.logAudit(adminId, 'logout_all', 'auth', '', {});

    return { success: true };
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
      data: { password: hashedPassword },
    });

    // Log audit
    await this.logAudit(adminId, 'change_password', 'auth', '', {});

    return { success: true };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store in Redis
    const redis = getRedisClient();
    await redis.setEx(
      `reset_token:${email}`,
      3600,
      resetToken
    );

    // Send email
    await sendEmail({
      to: email,
      subject: 'Reset Password',
      html: `
        <h1>Reset Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    // Log audit
    await this.logAudit(admin.id, 'forgot_password', 'auth', '', { email });

    return { success: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, token, newPassword } = resetPasswordDto;

    // Verify token from Redis
    const redis = getRedisClient();
    const storedToken = await redis.get(`reset_token:${email}`);

    if (!storedToken || storedToken !== token) {
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
      data: { password: hashedPassword },
    });

    // Delete reset token
    await redis.del(`reset_token:${email}`);

    // Log audit
    await this.logAudit(admin.id, 'reset_password', 'auth', '', { email });

    return { success: true };
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

    await prisma.adminSession.delete({
      where: { id: sessionId },
    });

    const redis = getRedisClient();
    await redis.del(`refresh_token:${adminId}:${sessionId}`);

    // Log audit
    await this.logAudit(adminId, 'revoke_session', 'auth', '', { sessionId });

    return { success: true };
  }

  private async logAudit(adminId: string, action: string, module: string, ipAddress: string, metadata: any) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        module,
        ipAddress,
        metadata,
      },
    });
  }
}
