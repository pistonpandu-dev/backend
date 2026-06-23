import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../repositories/base.repository';
import { prisma } from '../../config/database';

export class AdminRepository extends BaseRepository<any> {
  async findById(id: string) {
    return await prisma.admin.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async findByEmail(email: string) {
    return await prisma.admin.findUnique({
      where: { email },
    });
  }

  async findAll(params?: any) {
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
          updatedAt: true,
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
  }

  async create(data: any) {
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
  }

  async update(id: string, data: any) {
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
  }

  async delete(id: string) {
    return await prisma.admin.delete({
      where: { id },
    });
  }

  async updateLoginAttempts(id: string, attempts: number) {
    return await prisma.admin.update({
      where: { id },
      data: {
        loginAttempts: attempts,
        ...(attempts >= 5 && {
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        }),
      },
    });
  }
}

export const adminRepository = new AdminRepository();
