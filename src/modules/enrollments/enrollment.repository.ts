import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class EnrollmentRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.enrollment.findUnique({
      where: { id },
      include: {
        device: true,
      },
    });
  }

  async findByDeviceAndPin(deviceId: string, pinCode: string) {
    return await prisma.enrollment.findFirst({
      where: {
        device: {
          deviceId,
        },
        pinCode,
      },
      include: {
        device: true,
      },
    });
  }

  async findActiveByDevice(deviceId: string) {
    return await prisma.enrollment.findFirst({
      where: {
        device: {
          deviceId,
        },
        status: { in: ['pending', 'approved'] },
        OR: [
          { expiredAt: null },
          { expiredAt: { gt: new Date() } },
        ],
      },
    });
  }

  async findAll(params?: any) {
    const { page = 1, limit = 10, search, status, fromDate, toDate } = params || {};

    const where: Prisma.EnrollmentWhereInput = {};

    if (search) {
      where.OR = [
        { pinCode: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { device: { deviceId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (fromDate) {
      where.createdAt = { gte: fromDate };
    }

    if (toDate) {
      where.createdAt = { ...where.createdAt, lte: toDate };
    }

    const [data, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          device: {
            select: {
              id: true,
              deviceId: true,
              deviceName: true,
              status: true,
            },
          },
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: any) {
    return await prisma.enrollment.create({
      data,
      include: {
        device: true,
      },
    });
  }

  async update(id: string, data: any) {
    return await prisma.enrollment.update({
      where: { id },
      data,
      include: {
        device: true,
      },
    });
  }

  async delete(id: string) {
    return await prisma.enrollment.delete({
      where: { id },
    });
  }

  async getStatistics() {
    const [total, pending, approved, rejected, expired] = await Promise.all([
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: 'pending' } }),
      prisma.enrollment.count({ where: { status: 'approved' } }),
      prisma.enrollment.count({ where: { status: 'rejected' } }),
      prisma.enrollment.count({ where: { status: 'expired' } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      expired,
    };
  }
}

export const enrollmentRepository = new EnrollmentRepository();
