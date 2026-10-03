import { DuaStatus } from '@prisma/client';
import { z } from 'zod';

export const createDuaZodSchema = z
  .object({
    title: z.string().optional(),
    transliteration: z.string().optional(),
    duaBangla: z.string().optional(),
    meaningBangla: z.string().optional(),
    meaning: z.string().optional(),
    fadilah: z.string().optional(),
    arabicText: z.string().optional(),
    categoryId: z.string().uuid('categoryId must be a valid UUID').optional(),
    status: z.nativeEnum(DuaStatus).optional(),
  })
  .refine(
    (data) => Boolean((data.transliteration && data.transliteration.trim()) || (data.duaBangla && data.duaBangla.trim())),
    {
      message: 'Pronunciation/transliteration is required',
      path: ['transliteration'],
    },
  )
  .refine(
    (data) => Boolean((data.meaningBangla && data.meaningBangla.trim()) || (data.meaning && data.meaning.trim())),
    {
      message: 'Bengali meaning is required',
      path: ['meaningBangla'],
    },
  );

export const updateDuaZodSchema = z.object({
  title: z.string().min(1).optional(),
  transliteration: z.string().optional(),
  duaBangla: z.string().optional(),
  meaningBangla: z.string().optional(),
  meaning: z.string().optional(),
  fadilah: z.string().optional(),
  arabicText: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(DuaStatus).optional(),
});
