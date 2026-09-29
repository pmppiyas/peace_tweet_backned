import { z } from 'zod';

export const uploadFolderZodSchema = z.object({
  folder: z.string().optional(),
});
