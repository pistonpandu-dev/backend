import { z } from 'zod';

export const createMonitoringSchema = z.object({
  batteryLevel: z.number().min(0).max(100).optional(),
  chargingStatus: z.boolean().optional(),
  storageUsed: z.number().min(0).optional(),
  ramUsed: z.number().min(0).optional(),
  cpuUsage: z.number().min(0).max(100).optional(),
  temperature: z.number().min(-50).max(100).optional(),
  wifiInfo: z.string().optional(),
  mobileNetwork: z.string().optional(),
  androidVersion: z.string().optional(),
  sdkVersion: z.string().optional(),
  screenResolution: z.string().optional(),
});

export const monitoringQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['battery', 'cpu', 'memory', 'storage', 'temperature']).optional(),
});

export const monitoringStatsSchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

export type CreateMonitoringDto = z.infer<typeof createMonitoringSchema>;
export type MonitoringQueryDto = z.infer<typeof monitoringQuerySchema>;
export type MonitoringStatsDto = z.infer<typeof monitoringStatsSchema>;
