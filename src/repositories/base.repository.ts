import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(params?: any): Promise<T[]>;
  abstract create(data: any): Promise<T>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<T>;

  protected async handleError(error: any): Promise<never> {
    console.error('Repository error:', error);
    throw error;
  }
}
