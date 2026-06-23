import { prisma } from '../../config/database';

export class DashboardRepository {
  async getDeviceAnalytics(startDate: Date) {
    return await prisma.$transaction([
      prisma.device.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.deviceMonitoring.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.location.count({
        where: { createdAt: { gte: startDate } },
      }),
    ]);
  }

  async getSecurityStats() {
    return await prisma.securityAlert.groupBy({
      by: ['level', 'resolved'],
      _count: true,
    });
  }
}

export const dashboardRepository = new DashboardRepository();
