import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class SessionRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.remoteSession.findUnique({
      where: { id },
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findActiveByDevice(deviceId: string) {
    return await prisma.remoteSession.findFirst({
      where: {
        deviceId,
        status: { in: ['approved', 'active'] },
        endedAt: null,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(params?: any) {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status,
      deviceId,
      adminId,
      fromDate,
      toDate,
    } = params || {};

    const where: Prisma.RemoteSessionWhereInput = {};

    if (search) {
      where.OR = [
        { device: { deviceId: { contains: search, mode: 'insensitive' } } },
        { device: { deviceName: { contains: search, mode: 'insensitive' } } },
        { admin: { name: { contains: search, mode: 'insensitive' } } },
        { admin: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (adminId) {
      where.adminId = adminId;
    }

    if (fromDate) {
      where.createdAt = { gte: fromDate };
    }

    if (toDate) {
      where.createdAt = { ...where.createdAt, lte: toDate };
    }

    const [data, total] = await Promise.all([
      prisma.remoteSession.findMany({
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
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.remoteSession.count({ where }),
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
    return await prisma.remoteSession.create({
      data,
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, data: any) {
    return await prisma.remoteSession.update({
      where: { id },
      data,
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return await prisma.remoteSession.delete({
      where: { id },
    });
  }

  async getLogs(sessionId: string) {
    // This would typically fetch from a separate logs table
    // For now, return session data with timestamps
    const session = await prisma.remoteSession.findUnique({
      where: { id: sessionId },
      include: {
        device: true,
        admin: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      session,
      logs: [
        {
          action: 'session_created',
          timestamp: session.createdAt,
          data: { status: session.status },
        },
        ...(session.startedAt ? [{
          action: 'session_started',
          timestamp: session.startedAt,
          data: { status: 'approved' },
        }] : []),
        ...(session.endedAt ? [{
          action: 'session_ended',
          timestamp: session.endedAt,
          data: { status: 'ended' },
        }] : []),
      ],
    };
  }

  async getStatistics() {
    const [total, pending, approved, active, ended, rejected] = await Promise.all([
      prisma.remoteSession.count(),
      prisma.remoteSession.count({ where: { status: 'pending' } }),
      prisma.remoteSession.count({ where: { status: 'approved' } }),
      prisma.remoteSession.count({ where: { status: 'active' } }),
      prisma.remoteSession.count({ where: { status: 'ended' } }),
      prisma.remoteSession.count({ where: { status: 'rejected' } }),
    ]);

    return {
      total,
      pending,
      approved,
      active,
      ended,
      rejected,
    };
  }
}

export const sessionRepository = new SessionRepository();
