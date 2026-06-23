import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class FileRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.file.findUnique({
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

  async findAll(params?: any) {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      type,
      deviceId,
      adminId,
      fromDate,
      toDate,
    } = params || {};

    const where: Prisma.FileWhereInput = {};

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { fileType: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.fileType = { contains: type, mode: 'insensitive' };
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (adminId) {
      where.adminId = adminId;
    }

    if (fromDate) {
      where.createdAt = { gte: new Date(fromDate) };
    }

    if (toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
    }

    const [data, total] = await Promise.all([
      prisma.file.findMany({
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
      prisma.file.count({ where }),
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
    return await prisma.file.create({
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
    return await prisma.file.delete({
      where: { id },
    });
  }

  async search(params: any) {
    const { search, type, deviceId, fromDate, toDate } = params;

    const where: Prisma.FileWhereInput = {};

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { fileType: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['originalName'], string_contains: search } },
      ];
    }

    if (type) {
      where.fileType = { contains: type, mode: 'insensitive' };
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (fromDate) {
      where.createdAt = { gte: new Date(fromDate) };
    }

    if (toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
    }

    return await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
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

  async getStats() {
    const [total, byType, totalSize] = await Promise.all([
      prisma.file.count(),
      prisma.file.groupBy({
        by: ['fileType'],
        _count: true,
        _sum: {
          fileSize: true,
        },
      }),
      prisma.file.aggregate({
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    return {
      total,
      byType: byType.map(t => ({
        type: t.fileType,
        count: t._count,
        size: t._sum.fileSize,
      })),
      totalSize: totalSize._sum.fileSize,
    };
  }
}

export const fileRepository = new FileRepository();
