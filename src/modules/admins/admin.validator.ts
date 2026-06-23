import { z } from 'zod';
import { ROLES } from '../../constants/roles';

export const createAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER]).optional(),
});

export const updateAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER]).optional(),
  avatar: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const adminQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER]).optional(),
  isActive: z.boolean().optional(),
});

export type CreateAdminDto = z.infer<typeof createAdminSchema>;
export type UpdateAdminDto = z.infer<typeof updateAdminSchema>;
export type AdminQueryDto = z.infer<typeof adminQuerySchema>;
