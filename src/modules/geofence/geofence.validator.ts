import { z } from 'zod';

export const createGeofenceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  radius: z.number().positive().min(10, 'Radius must be at least 10 meters'),
});

export const updateGeofenceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long').optional(),
  latitude: z.number().min(-90).max(90, 'Invalid latitude').optional(),
  longitude: z.number().min(-180).max(180, 'Invalid longitude').optional(),
  radius: z.number().positive().min(10, 'Radius must be at least 10 meters').optional(),
  isActive: z.boolean().optional(),
});

export const geofenceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  deviceId: z.string().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const geofenceEventSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  event: z.enum(['enter', 'exit']),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
});

export type CreateGeofenceDto = z.infer<typeof createGeofenceSchema>;
export type UpdateGeofenceDto = z.infer<typeof updateGeofenceSchema>;
export type GeofenceQueryDto = z.infer<typeof geofenceQuerySchema>;
export type GeofenceEventDto = z.infer<typeof geofenceEventSchema>;
