import { Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { prisma } from '../config/database';

export class DeviceRepository extends BaseRepository<any> {
  async findById(id: string) {
    try {
      return await prisma.device.findUnique({
        where: { id },
        include: {
          monitoring: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          locations: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          enrollments: true,
          groupMembers: {
            include: {
              group: true,
            },
          },
          tagMembers: {
            include: {
              tag: true,
            },
          },
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findByDeviceId(deviceId: string) {
    try {
      return await prisma.device.findUnique({
        where: { deviceId },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findAll(params?: any) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        groupId,
        tagId,
        brand,
        model,
        fromDate,
        toDate,
        trustScoreMin,
        trustScoreMax,
      } = params || {};

      const where: Prisma.DeviceWhereInput = {
        deletedAt: null,
      };

      if (search) {
        where.OR = [
          { deviceId: { contains: search, mode: 'insensitive' } },
          { deviceName: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (groupId) {
        where.groupMembers = {
          some: { groupId },
        };
      }

      if (tagId) {
        where.tagMembers = {
          some: { tagId },
        };
      }

      if (brand) {
        where.brand = { contains: brand, mode: 'insensitive' };
      }

      if (model) {
        where.model = { contains: model, mode: 'insensitive' };
      }

      if (fromDate) {
        where.createdAt = { gte: fromDate };
      }

      if (toDate) {
        where.createdAt = { ...where.createdAt, lte: toDate };
      }

      if (trustScoreMin !== undefined) {
        where.trustScore = { gte: trustScoreMin };
      }

      if (trustScoreMax !== undefined) {
        where.trustScore = { ...where.trustScore, lte: trustScoreMax };
      }

      const [data, total] = await Promise.all([
        prisma.device.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            monitoring: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            groupMembers: {
              include: {
                group: true,
              },
            },
            tagMembers: {
              include: {
                tag: true,
              },
            },
          },
        }),
        prisma.device.count({ where }),
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
    } catch (error) {
      return this.handleError(error);
    }
  }

  async create(data: any) {
    try {
      return await prisma.device.create({
        data,
        include: {
          monitoring: true,
          groupMembers: {
            include: {
              group: true,
            },
          },
          tagMembers: {
            include: {
              tag: true,
            },
          },
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async update(id: string, data: any) {
    try {
      return await prisma.device.update({
        where: { id },
        data,
        include: {
          monitoring: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          groupMembers: {
            include: {
              group: true,
            },
          },
          tagMembers: {
            include: {
              tag: true,
            },
          },
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      return await prisma.device.update({
        where: { id },
        data: {
          status: status as any,
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateTrustScore(id: string, score: number) {
    try {
      return await prisma.device.update({
        where: { id },
        data: {
          trustScore: score,
          lastVerification: new Date(),
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete(id: string) {
    try {
      return await prisma.device.update({
        where: { id },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getStatistics() {
    try {
      const [total, online, offline, alerts] = await Promise.all([
        prisma.device.count({ where: { deletedAt: null } }),
        prisma.device.count({ where: { status: 'online', deletedAt: null } }),
        prisma.device.count({ where: { status: 'offline', deletedAt: null } }),
        prisma.securityAlert.count({
          where: {
            resolved: false,
            level: { in: ['high', 'critical'] },
          },
        }),
      ]);

      return { total, online, offline, alerts };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const deviceRepository = new DeviceRepository();
