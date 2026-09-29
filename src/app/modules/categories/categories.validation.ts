import { z } from 'zod';

export const createCategoryZodSchema = z.object({
  nameBangla: z
    .string({ required_error: 'nameBangla is required' })
    .min(1, 'nameBangla cannot be empty'),
  nameEnglish: z.string().optional(),
  slug: z.string({ required_error: 'slug is required' }).min(1, 'slug cannot be empty'),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const updateCategoryZodSchema = z.object({
  nameBangla: z.string().min(1).optional(),
  nameEnglish: z.string().optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
});
