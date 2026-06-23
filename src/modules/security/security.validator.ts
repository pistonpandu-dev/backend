import { z } from 'zod';

export const securityAlertQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  resolved: z.boolean().optional(),
  deviceId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  adminId: z.string().optional(),
});

export const resolveAlertSchema = z.object({
  resolvedBy: z.string().optional(),
  actionTaken: z.string().optional(),
});

export type SecurityAlertQueryDto = z.infer<typeof securityAlertQuerySchema>;
export type AuditLogQueryDto = z.infer<typeof auditLogQuerySchema>;
export type ResolveAlertDto = z.infer<typeof resolveAlertSchema>;
