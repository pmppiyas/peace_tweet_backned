import { z } from 'zod';

export const addSearchHistoryZodSchema = z.object({
  query: z.string({
    required_error: 'Search query is required',
  }).min(1, 'Query cannot be empty').max(100),
  entityType: z.enum(['KEYWORD', 'USER', 'DUA', 'GROUP']).optional(),
  entityId: z.string().optional().nullable(),
  entityName: z.string().optional().nullable(),
  entityAvatar: z.string().optional().nullable(),
  entitySubtext: z.string().optional().nullable(),
});
