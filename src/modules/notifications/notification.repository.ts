import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class NotificationRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.notification.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
      },
    });
  }

  async findAll(where: any, page: number, limit: number) {
    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          device: {
            select: {
              id: true,
              deviceId: true,
              deviceName: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
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
    return await prisma.notification.create({
      data,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
      },
    });
  }

  async update(id: string, data: any) {
    return await prisma.notification.update({
      where: { id },
      data,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return await prisma.notification.delete({
      where: { id },
    });
  }

  async markAllAsRead(adminId: string) {
    return await prisma.notification.updateMany({
      where: {
        adminId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(adminId: string) {
    return await prisma.notification.count({
      where: {
        adminId,
        isRead: false,
      },
    });
  }

  async getAdmin(id: string) {
    return await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }
}

export const notificationRepository = new NotificationRepository();
