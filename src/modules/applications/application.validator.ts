import { z } from 'zod';

export const syncApplicationsSchema = z.object({
  applications: z.array(
    z.object({
      packageName: z.string().min(1, 'Package name is required'),
      appName: z.string().min(1, 'App name is required'),
      version: z.string().optional(),
      installedAt: z.string().datetime().optional(),
    })
  ),
});

export const applicationQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type SyncApplicationsDto = z.infer<typeof syncApplicationsSchema>;
export type ApplicationQueryDto = z.infer<typeof applicationQuerySchema>;
