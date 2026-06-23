import { z } from 'zod';

export const logsQuerySchema = z.object({
  type: z.enum(['error', 'combined', 'security', 'audit', 'access']).default('combined'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(100),
  search: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const exportLogsSchema = z.object({
  type: z.enum(['error', 'combined', 'security', 'audit', 'access']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['json', 'csv', 'txt']).default('json'),
});

export type LogsQueryDto = z.infer<typeof logsQuerySchema>;
export type ExportLogsDto = z.infer<typeof exportLogsSchema>;
