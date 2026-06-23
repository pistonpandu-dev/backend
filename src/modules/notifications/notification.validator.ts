import { z } from 'zod';

export const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.string().min(1, 'Type is required'),
  adminId: z.string().optional(),
  deviceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  sendEmail: z.boolean().default(false),
  sendFCM: z.boolean().default(false),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  adminId: z.string().optional(),
  deviceId: z.string().optional(),
  type: z.string().optional(),
  isRead: z.boolean().optional(),
});

export const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
export type NotificationQueryDto = z.infer<typeof notificationQuerySchema>;
export type MarkReadDto = z.infer<typeof markReadSchema>;
