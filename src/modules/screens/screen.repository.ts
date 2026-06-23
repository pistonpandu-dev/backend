import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class ScreenRepository extends BaseRepository<any> {
  // Screenshot methods
  async findScreenshotById(id: string) {
    return await prisma.screenSession.findUnique({
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

  async createScreenshot(data: any) {
    return await prisma.screenSession.create({
      data: {
        deviceId: data.deviceId,
        adminId: data.adminId,
        screenshotUrl: data.screenshotUrl,
        recordingUrl: null,
        metadata: data.metadata || {},
      },
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

  async getScreenshots(query: any) {
    const { 
      page = 1, 
      limit = 20, 
      deviceId,
      adminId,
      fromDate,
      toDate,
    } = query || {};

    const where: Prisma.ScreenSessionWhereInput = {
      screenshotUrl: { not: null },
    };

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
      prisma.screenSession.findMany({
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
      prisma.screenSession.count({ where }),
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

  async deleteScreenshot(id: string) {
    return await prisma.screenSession.delete({
      where: { id },
    });
  }

  // Recording methods
  async findRecordingById(id: string) {
    return await prisma.screenSession.findUnique({
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

  async createRecording(data: any) {
    return await prisma.screenSession.create({
      data: {
        deviceId: data.deviceId,
        adminId: data.adminId,
        recordingUrl: data.recordingUrl,
        screenshotUrl: null,
        metadata: {
          duration: data.duration,
          quality: data.quality,
          startedAt: data.startedAt,
          status: data.status,
        },
      },
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

  async updateRecording(id: string, data: any) {
    const updateData: any = {};
    
    if (data.status) {
      updateData.metadata = {
        ...(await this.getMetadata(id)),
        status: data.status,
      };
    }

    if (data.endedAt) {
      updateData.metadata = {
        ...(await this.getMetadata(id)),
        endedAt: data.endedAt,
      };
    }

    return await prisma.screenSession.update({
      where: { id },
      data: updateData,
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

  async getRecordings(query: any) {
    const { 
      page = 1, 
      limit = 20, 
      deviceId,
      adminId,
      fromDate,
      toDate,
      status,
    } = query || {};

    const where: Prisma.ScreenSessionWhereInput = {
      recordingUrl: { not: null },
    };

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

    if (status) {
      where.metadata = {
        path: ['status'],
        equals: status,
      };
    }

    const [data, total] = await Promise.all([
      prisma.screenSession.findMany({
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
      prisma.screenSession.count({ where }),
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

  async deleteRecording(id: string) {
    return await prisma.screenSession.delete({
      where: { id },
    });
  }

  private async getMetadata(id: string): Promise<any> {
    const session = await prisma.screenSession.findUnique({
      where: { id },
      select: { metadata: true },
    });
    return session?.metadata || {};
  }
}

export const screenRepository = new ScreenRepository();
