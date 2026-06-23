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

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      // Log failed attempt
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

    // Check if admin is active
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

    // Check if account is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new Error(`Account locked until ${admin.lockedUntil.toISOString()}`);
    }

    // Verify password
    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      // Increment login attempts
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          loginAttempts: { increment: 1 },
          ...(admin.loginAttempts + 1 >= 5 && {
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // Lock for 30 minutes
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

    // Reset login attempts on successful login
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

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

    // Store refresh token in Redis
    const redis = getRedisClient();
    await redis.setEx(
      `refresh_token:${admin.id}:${session.id}`,
      rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      refreshToken
    );

    // Log successful login
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

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new Error('Admin already exists with this email');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'operator',
        lastPasswordChange: new Date(),
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });

    // Send welcome email
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

    // Log registration
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

    // Check if admin is active
    if (!session.admin.isActive) {
      throw new Error('Account is disabled');
    }

    // Check if token is blacklisted
    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
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
    await redis.del(`refresh_token:${session.adminId}:${session.id}`);
    await redis.setEx(
      `refresh_token:${session.adminId}:${session.id}`,
      30 * 24 * 60 * 60,
      newRefreshToken
    );

    // Log refresh
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

  // ... (continue with other methods)
}
