import { z } from 'zod';

export const createShareZodSchema = z.object({
  contentType: z.enum(['POST', 'DUA', 'BLOOD_REQUEST']),
  contentId: z.string().min(1, 'contentId is required'),
  target: z.enum(['FEED', 'GROUP', 'LINK']),
  groupId: z.string().optional(),
  caption: z.string().max(2000).optional(),
});

