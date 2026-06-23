import { z } from 'zod';

export const requestSessionSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
});

export const updateSessionSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'active', 'ended']).optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

export const sessionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'active', 'ended']).optional(),
  deviceId: z.string().optional(),
  adminId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export type RequestSessionDto = z.infer<typeof requestSessionSchema>;
export type UpdateSessionDto = z.infer<typeof updateSessionSchema>;
export type SessionQueryDto = z.infer<typeof sessionQuerySchema>;
