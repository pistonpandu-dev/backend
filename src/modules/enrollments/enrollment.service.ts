import { enrollmentRepository } from './enrollment.repository';
import { deviceRepository } from '../devices/device.repository';
import { SecurityAuditService } from '../security/audit.service';
import { NotificationService } from '../../services/notification.service';
import { generatePIN } from '../../utils/auth.util';
import { logger } from '../../config/logger';

export class EnrollmentService {
  private static instance: EnrollmentService;
  private auditService: SecurityAuditService;
  private notificationService: NotificationService;

  private constructor() {
    this.auditService = SecurityAuditService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): EnrollmentService {
    if (!EnrollmentService.instance) {
      EnrollmentService.instance = new EnrollmentService();
    }
    return EnrollmentService.instance;
  }

  async getAllEnrollments(query: any) {
    return await enrollmentRepository.findAll(query);
  }

  async getEnrollmentById(id: string) {
    const enrollment = await enrollmentRepository.findById(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    return enrollment;
  }

  async createEnrollment(data: any) {
    const { deviceId, email } = data;

    // Check if device exists
    const device = await deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Check if device already has active enrollment
    const existing = await enrollmentRepository.findActiveByDevice(deviceId);
    if (existing) {
      throw new Error('Device already has an active enrollment');
    }

    // Generate PIN
    const pinCode = generatePIN(6);

    const enrollment = await enrollmentRepository.create({
      deviceId: device.id,
      pinCode,
      email,
      status: 'pending',
      expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send notification
    await this.notificationService.sendNewEnrollmentNotification(deviceId, 'pending');

    await this.auditService.logSecurityEvent({
      action: 'enrollment_created',
      module: 'enrollments',
      level: 'info',
      description: `Enrollment created for device ${deviceId}`,
      metadata: { deviceId, email },
    });

    return enrollment;
  }

  async updateEnrollment(id: string, data: any) {
    const enrollment = await enrollmentRepository.findById(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const updated = await enrollmentRepository.update(id, data);

    await this.auditService.logSecurityEvent({
      action: 'enrollment_updated',
      module: 'enrollments',
      level: 'info',
      description: `Enrollment ${id} updated`,
      metadata: { enrollmentId: id, updatedFields: Object.keys(data) },
    });

    return updated;
  }

  async deleteEnrollment(id: string) {
    const enrollment = await enrollmentRepository.findById(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    await enrollmentRepository.delete(id);

    await this.auditService.logSecurityEvent({
      action: 'enrollment_deleted',
      module: 'enrollments',
      level: 'high',
      description: `Enrollment ${id} deleted`,
      metadata: { enrollmentId: id },
    });
  }

  async approveEnrollment(id: string, data: any) {
    const enrollment = await enrollmentRepository.findById(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const updated = await enrollmentRepository.update(id, {
      status: 'approved',
      ...data,
    });

    // Update device status
    await deviceRepository.update(enrollment.deviceId, {
      status: 'online',
    });

    // Send notification
    await this.notificationService.sendNewEnrollmentNotification(
      enrollment.device.deviceId,
      'approved'
    );

    await this.auditService.logSecurityEvent({
      action: 'enrollment_approved',
      module: 'enrollments',
      level: 'high',
      description: `Enrollment ${id} approved`,
      metadata: { enrollmentId: id, deviceId: enrollment.deviceId },
    });

    return updated;
  }

  async rejectEnrollment(id: string) {
    const enrollment = await enrollmentRepository.findById(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const updated = await enrollmentRepository.update(id, {
      status: 'rejected',
    });

    await this.notificationService.sendNewEnrollmentNotification(
      enrollment.device.deviceId,
      'rejected'
    );

    await this.auditService.logSecurityEvent({
      action: 'enrollment_rejected',
      module: 'enrollments',
      level: 'high',
      description: `Enrollment ${id} rejected`,
      metadata: { enrollmentId: id, deviceId: enrollment.deviceId },
    });

    return updated;
  }

  async verifyEnrollment(deviceId: string, pinCode: string) {
    const enrollment = await enrollmentRepository.findByDeviceAndPin(deviceId, pinCode);
    if (!enrollment) {
      throw new Error('Invalid PIN or device not found');
    }

    if (enrollment.status !== 'pending') {
      throw new Error(`Enrollment is ${enrollment.status}`);
    }

    if (enrollment.expiredAt && enrollment.expiredAt < new Date()) {
      throw new Error('Enrollment has expired');
    }

    // Auto-approve for PIN verification
    const updated = await enrollmentRepository.update(enrollment.id, {
      status: 'approved',
    });

    await deviceRepository.update(enrollment.deviceId, {
      status: 'online',
    });

    await this.auditService.logSecurityEvent({
      action: 'enrollment_verified',
      module: 'enrollments',
      level: 'info',
      description: `Enrollment ${enrollment.id} verified via PIN`,
      metadata: { enrollmentId: enrollment.id, deviceId },
    });

    return updated;
  }
}
