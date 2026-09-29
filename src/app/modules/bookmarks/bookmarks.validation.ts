import { z } from 'zod';

export const bookmarkZodSchema = z.object({
  duaId: z.string().uuid().optional(),
});
