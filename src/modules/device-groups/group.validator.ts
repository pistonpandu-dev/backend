import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  description: z.string().optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long').optional(),
  description: z.string().optional(),
});

export const groupQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type CreateGroupDto = z.infer<typeof createGroupSchema>;
export type UpdateGroupDto = z.infer<typeof updateGroupSchema>;
export type GroupQueryDto = z.infer<typeof groupQuerySchema>;
