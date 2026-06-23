import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class TagRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.deviceTag.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            device: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
  }

  async findByName(name: string) {
    return await prisma.deviceTag.findUnique({
      where: { name },
    });
  }

  async findAll(params?: any) {
    const { page = 1, limit = 10, search } = params || {};

    const where: Prisma.DeviceTagWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.deviceTag.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          members: {
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
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      }),
      prisma.deviceTag.count({ where }),
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
    return await prisma.deviceTag.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return await prisma.deviceTag.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return await prisma.deviceTag.delete({
      where: { id },
    });
  }

  async addDevice(tagId: string, deviceId: string) {
    return await prisma.deviceTagMember.create({
      data: {
        tagId,
        deviceId,
      },
      include: {
        tag: true,
        device: true,
      },
    });
  }

  async removeDevice(tagId: string, deviceId: string) {
    return await prisma.deviceTagMember.delete({
      where: {
        tagId_deviceId: {
          tagId,
          deviceId,
        },
      },
    });
  }

  async getTagDevices(tagId: string) {
    return await prisma.deviceTagMember.findMany({
      where: { tagId },
      include: {
        device: true,
      },
    });
  }
}

export const tagRepository = new TagRepository();
