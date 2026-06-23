import { z } from 'zod';

export const captureScreenshotSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  screenshotData: z.string().min(1, 'Screenshot data is required'),
  metadata: z.record(z.any()).optional(),
});

export const startRecordingSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  duration: z.number().positive().optional(),
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const screenQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  deviceId: z.string().optional(),
  adminId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  status: z.enum(['recording', 'completed', 'failed']).optional(),
});

export type CaptureScreenshotDto = z.infer<typeof captureScreenshotSchema>;
export type StartRecordingDto = z.infer<typeof startRecordingSchema>;
export type ScreenQueryDto = z.infer<typeof screenQuerySchema>;
