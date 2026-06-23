import { z } from 'zod';

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  accuracy: z.number().positive().optional(),
  speed: z.number().positive().optional(),
  address: z.string().optional(),
});

export const locationQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export const findDeviceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  radius: z.number().positive().default(1000),
});

export const lostModeSchema = z.object({
  message: z.string().optional(),
  contact: z.string().optional(),
});

export type UpdateLocationDto = z.infer<typeof updateLocationSchema>;
export type LocationQueryDto = z.infer<typeof locationQuerySchema>;
export type FindDeviceDto = z.infer<typeof findDeviceSchema>;
export type LostModeDto = z.infer<typeof lostModeSchema>;
