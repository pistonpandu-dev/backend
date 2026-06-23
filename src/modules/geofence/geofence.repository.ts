import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class GeofenceRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.geofence.findUnique({
      where: { id },
      include: {
        device: true,
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            logs: true,
          },
        },
      },
    });
  }

  async findByName(deviceId: string, name: string) {
    return await prisma.geofence.findFirst({
      where: {
        deviceId,
        name,
      },
    });
  }

  async findAll(params?: any) {
    const { page = 1, limit = 10, search, deviceId, isActive } = params || {};

    const where: Prisma.GeofenceWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { device: { deviceName: { contains: search, mode: 'insensitive' } } },
        { device: { deviceId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      prisma.geofence.findMany({
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
          _count: {
            select: {
              logs: true,
            },
          },
        },
      }),
      prisma.geofence.count({ where }),
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
    return await prisma.geofence.create({
      data,
      include: {
        device: true,
      },
    });
  }

  async update(id: string, data: any) {
    return await prisma.geofence.update({
      where: { id },
      data,
      include: {
        device: true,
      },
    });
  }

  async delete(id: string) {
    return await prisma.geofence.delete({
      where: { id },
    });
  }

  async createLog(data: any) {
    return await prisma.geofenceLog.create({
      data,
      include: {
        device: true,
        geofence: true,
      },
    });
  }

  async getLogs(where: any, limit: number, offset: number) {
    return await prisma.geofenceLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
        geofence: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async countLogs(where: any) {
    return await prisma.geofenceLog.count({ where });
  }

  async getDeviceGeofences(deviceId: string) {
    return await prisma.geofence.findMany({
      where: {
        deviceId,
        isActive: true,
      },
    });
  }
}

export const geofenceRepository = new GeofenceRepository();
