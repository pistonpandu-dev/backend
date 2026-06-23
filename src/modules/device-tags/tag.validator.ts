import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(30, 'Name too long'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format').optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(30, 'Name too long').optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format').optional(),
});

export const tagQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type CreateTagDto = z.infer<typeof createTagSchema>;
export type UpdateTagDto = z.infer<typeof updateTagSchema>;
export type TagQueryDto = z.infer<typeof tagQuerySchema>;
