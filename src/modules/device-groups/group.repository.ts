import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class GroupRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.deviceGroup.findUnique({
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
    return await prisma.deviceGroup.findUnique({
      where: { name },
    });
  }

  async findAll(params?: any) {
    const { page = 1, limit = 10, search } = params || {};

    const where: Prisma.DeviceGroupWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.deviceGroup.findMany({
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
      prisma.deviceGroup.count({ where }),
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
    return await prisma.deviceGroup.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return await prisma.deviceGroup.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return await prisma.deviceGroup.delete({
      where: { id },
    });
  }

  async addDevice(groupId: string, deviceId: string) {
    return await prisma.deviceGroupMember.create({
      data: {
        groupId,
        deviceId,
      },
      include: {
        group: true,
        device: true,
      },
    });
  }

  async removeDevice(groupId: string, deviceId: string) {
    return await prisma.deviceGroupMember.delete({
      where: {
        groupId_deviceId: {
          groupId,
          deviceId,
        },
      },
    });
  }

  async getGroupDevices(groupId: string) {
    return await prisma.deviceGroupMember.findMany({
      where: { groupId },
      include: {
        device: true,
      },
    });
  }
}

export const groupRepository = new GroupRepository();
