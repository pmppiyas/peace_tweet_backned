import { SourceType } from '@prisma/client';
import { z } from 'zod';

export const createSourceZodSchema = z.object({
  nameBangla: z
    .string({ required_error: 'nameBangla is required' })
    .min(1, 'nameBangla cannot be empty'),
  nameEnglish: z.string().optional(),
  type: z.nativeEnum(SourceType).optional(),
});

export const updateSourceZodSchema = z.object({
  nameBangla: z.string().min(1).optional(),
  nameEnglish: z.string().optional(),
  type: z.nativeEnum(SourceType).optional(),
});
