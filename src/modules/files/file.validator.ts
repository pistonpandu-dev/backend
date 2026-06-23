import { z } from 'zod';

export const uploadFileSchema = z.object({
  deviceId: z.string().optional(),
  fileType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const fileQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.string().optional(),
  deviceId: z.string().optional(),
  adminId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const fileSearchSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  deviceId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export type UploadFileDto = z.infer<typeof uploadFileSchema>;
export type FileQueryDto = z.infer<typeof fileQuerySchema>;
export type FileSearchDto = z.infer<typeof fileSearchSchema>;
