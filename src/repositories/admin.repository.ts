import { Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { prisma } from '../config/database';

export class AdminRepository extends BaseRepository<any> {
  async findById(id: string) {
    try {
      return await prisma.admin.findUnique({
        where: { id },
        include: {
          sessions: true,
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findByEmail(email: string) {
    try {
      return await prisma.admin.findUnique({
        where: { email },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findAll(params?: any) {
    try {
      const { page = 1, limit = 10, search, role, isActive } = params || {};
      
      const where: Prisma.AdminWhereInput = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      if (role) {
        where.role = role;
      }
      
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [data, total] = await Promise.all([
        prisma.admin.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            _count: {
              select: {
                sessions: true,
              },
            },
          },
        }),
        prisma.admin.count({ where }),
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
      return await prisma.admin.create({
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async update(id: string, data: any) {
    try {
      return await prisma.admin.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          isActive: true,
          lastLogin: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete(id: string) {
    try {
      return await prisma.admin.delete({
        where: { id },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateLoginAttempts(id: string, attempts: number) {
    try {
      return await prisma.admin.update({
        where: { id },
        data: {
          loginAttempts: attempts,
          ...(attempts >= 5 && {
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
          }),
        },
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const adminRepository = new AdminRepository();
