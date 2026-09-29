import { DuaStatus } from '@prisma/client';
import { z } from 'zod';

export const createDuaZodSchema = z.object({
  title: z.string({ required_error: 'title is required' }).min(1, 'title cannot be empty'),
  fadilah: z.string({ required_error: 'fadilah is required' }).min(1, 'fadilah cannot be empty'),
  duaBangla: z
    .string({ required_error: 'duaBangla is required' })
    .min(1, 'duaBangla cannot be empty'),
  meaningBangla: z
    .string({ required_error: 'meaningBangla is required' })
    .min(1, 'meaningBangla cannot be empty'),
  arabicText: z.string().optional(),
  transliteration: z.string().optional(),
  categoryId: z
    .string({ required_error: 'categoryId is required' })
    .uuid('categoryId must be a valid UUID'),
  status: z.nativeEnum(DuaStatus).optional(),
});

export const updateDuaZodSchema = z.object({
  title: z.string().min(1).optional(),
  fadilah: z.string().min(1).optional(),
  duaBangla: z.string().min(1).optional(),
  meaningBangla: z.string().min(1).optional(),
  arabicText: z.string().optional(),
  transliteration: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(DuaStatus).optional(),
});
