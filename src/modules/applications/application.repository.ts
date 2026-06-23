import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class ApplicationRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.application.findUnique({
      where: { id },
      include: {
        device: true,
      },
    });
  }

  async findByDevice(deviceId: string) {
    return await prisma.application.findMany({
      where: { deviceId },
    });
  }

  async findAll(deviceId: string, params?: any) {
    const { search, page = 1, limit = 20 } = params || {};

    const where: Prisma.ApplicationWhereInput = { deviceId };

    if (search) {
      where.OR = [
        { appName: { contains: search, mode: 'insensitive' } },
        { packageName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { appName: 'asc' },
      }),
      prisma.application.count({ where }),
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
    return await prisma.application.create({
      data,
      include: {
        device: true,
      },
    });
  }

  async update(id: string, data: any) {
    return await prisma.application.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return await prisma.application.delete({
      where: { id },
    });
  }

  async deleteByDevice(deviceId: string) {
    return await prisma.application.deleteMany({
      where: { deviceId },
    });
  }

  async getStats(deviceId: string) {
    const [total, uniquePackages, latest] = await Promise.all([
      prisma.application.count({ where: { deviceId } }),
      prisma.application.groupBy({
        by: ['packageName'],
        where: { deviceId },
      }),
      prisma.application.findMany({
        where: { deviceId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total,
      uniquePackages: uniquePackages.length,
      latest,
    };
  }

  async search(deviceId: string, searchTerm: string) {
    return await prisma.application.findMany({
      where: {
        deviceId,
        OR: [
          { appName: { contains: searchTerm, mode: 'insensitive' } },
          { packageName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { appName: 'asc' },
    });
  }
}

export const applicationRepository = new ApplicationRepository();
