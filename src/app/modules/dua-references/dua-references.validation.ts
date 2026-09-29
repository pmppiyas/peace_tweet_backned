import { z } from 'zod';

export const createDuaReferenceZodSchema = z.object({
  sourceId: z
    .string({ required_error: 'sourceId is required' })
    .uuid('sourceId must be a valid UUID'),
  referenceText: z
    .string({ required_error: 'referenceText is required' })
    .min(1, 'referenceText cannot be empty'),
  verseOrHadithNumber: z.string().optional(),
});

export const updateDuaReferenceZodSchema = z.object({
  sourceId: z.string().uuid().optional(),
  referenceText: z.string().min(1).optional(),
  verseOrHadithNumber: z.string().optional(),
});
