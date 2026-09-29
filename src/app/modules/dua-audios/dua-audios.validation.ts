import { z } from 'zod';

export const createDuaAudioZodSchema = z.object({
  audioUrl: z.string({ required_error: 'audioUrl is required' }).min(1, 'audioUrl cannot be empty'),
  reciterName: z.string().optional(),
  language: z.string().optional(),
  durationSeconds: z.number().optional(),
});

export const updateDuaAudioZodSchema = z.object({
  audioUrl: z.string().min(1).optional(),
  reciterName: z.string().optional(),
  language: z.string().optional(),
  durationSeconds: z.number().optional(),
});
