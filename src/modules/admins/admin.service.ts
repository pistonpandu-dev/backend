import { Prisma } from '@prisma/client';
import { adminRepository } from './admin.repository';
import { hashPassword } from '../../utils/password.util';
import { logger } from '../../config/logger';
import { SecurityAuditService } from '../security/audit.service';
import { sendEmail } from '../../services/email.service';

export class AdminService {
  private static instance: AdminService;
  private auditService: SecurityAuditService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
  }

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  async getAllAdmins(query: any) {
    return await adminRepository.findAll(query);
  }

  async getAdminById(id: string) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new Error('Admin not found');
    }
    return admin;
  }

  async createAdmin(data: any) {
    const { email, password, name, role } = data;

    // Check if admin already exists
    const existing = await adminRepository.findByEmail(email);
    if (existing) {
      throw new Error('Admin with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const admin = await adminRepository.create({
      email,
      password: hashedPassword,
      name,
      role,
      lastPasswordChange: new Date(),
      passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    // Send welcome email
    await sendEmail({
      to: email,
      subject: 'Welcome to Rayan Admin',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Your admin account has been created.</p>
        <p>Role: ${role}</p>
        <p>Email: ${email}</p>
        <p>Please login to access the admin panel.</p>
        <a href="${process.env.FRONTEND_URL}">Go to Admin Panel</a>
      `,
    });

    await this.auditService.logSecurityEvent({
      action: 'admin_created',
      module: 'admins',
      level: 'info',
      description: `Admin ${email} created with role ${role}`,
      metadata: { email, role },
    });

    return admin;
  }

  async updateAdmin(id: string, data: any) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // If updating password, hash it
    if (data.password) {
      data.password = await hashPassword(data.password);
      data.lastPasswordChange = new Date();
      data.passwordExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }

    const updated = await adminRepository.update(id, data);

    await this.auditService.logSecurityEvent({
      adminId: id,
      action: 'admin_updated',
      module: 'admins',
      level: 'info',
      description: `Admin ${admin.email} updated`,
      metadata: { updatedFields: Object.keys(data) },
    });

    return updated;
  }

  async deleteAdmin(id: string) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Prevent deleting super admin
    if (admin.role === 'super_admin') {
      throw new Error('Cannot delete super admin');
    }

    await adminRepository.delete(id);

    await this.auditService.logSecurityEvent({
      adminId: id,
      action: 'admin_deleted',
      module: 'admins',
      level: 'high',
      description: `Admin ${admin.email} deleted`,
      metadata: { email: admin.email },
    });
  }

  async toggleAdminStatus(id: string, isActive: boolean) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Prevent deactivating super admin
    if (admin.role === 'super_admin' && !isActive) {
      throw new Error('Cannot deactivate super admin');
    }

    const updated = await adminRepository.update(id, { isActive });

    await this.auditService.logSecurityEvent({
      adminId: id,
      action: isActive ? 'admin_activated' : 'admin_deactivated',
      module: 'admins',
      level: 'high',
      description: `Admin ${admin.email} ${isActive ? 'activated' : 'deactivated'}`,
      metadata: { email: admin.email, isActive },
    });

    return updated;
  }
}
