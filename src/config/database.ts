import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query ${params.model}.${params.action}`, {
      duration: `${after - before}ms`,
      args: params.args,
    });
  }
  
  return result;
});

prisma.$use(async (params, next) => {
  if (params.model === 'Device' && params.action === 'findMany') {
    params.args = params.args || {};
    params.args.where = params.args.where || {};
    params.args.where.deletedAt = null;
  }
  return next(params);
});

export { prisma };
