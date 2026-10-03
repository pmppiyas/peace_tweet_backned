import { PostStatus, PostType, PostVisibility } from '@prisma/client';
import { z } from 'zod';

export const createPostZodSchema = z.object({
  content: z.string().max(5000, 'Post content cannot exceed 5000 characters').optional(),
  type: z.nativeEnum(PostType).optional().default(PostType.TEXT),
  visibility: z.nativeEnum(PostVisibility).optional().default(PostVisibility.PUBLIC),
  status: z.nativeEnum(PostStatus).optional().default(PostStatus.PUBLISHED),
  mediaUrls: z.array(z.string()).optional().default([]),
  mediaLayout: z.string().optional().default('COLLAGE'),
  duaId: z.string().uuid().optional(),
  duaData: z
    .object({
      title: z.string().optional(),
      transliteration: z.string().optional(),
      meaning: z.string().optional(),
      meaningBangla: z.string().optional(),
      fadilah: z.string().optional(),
      arabicText: z.string().optional(),
    })
    .optional(),
  bloodRequestId: z.string().uuid().optional(),
  bloodRequestData: z
    .object({
      patientName: z.string().min(1, 'Patient name is required'),
      patientAge: z.number().int().optional(),
      problem: z.string().optional(),
      bloodGroup: z.string(),
      units: z.number().int().min(1).optional().default(1),
      hospitalName: z.string().min(1, 'Hospital name is required'),
      hospitalAddress: z.string().optional(),
      location: z.string().min(1, 'Location is required'),
      contactNumber: z.string().min(1, 'Contact number is required'),
      alternateContact: z.string().optional(),
      neededDate: z.string(),
      urgency: z.string().optional().default('REGULAR'),
      note: z.string().optional(),
      forMyself: z.boolean().optional(),
    })
    .optional(),
});

export const updatePostZodSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  type: z.nativeEnum(PostType).optional(),
  visibility: z.nativeEnum(PostVisibility).optional(),
  status: z.nativeEnum(PostStatus).optional(),
  mediaUrls: z.array(z.string()).optional(),
  mediaLayout: z.string().optional(),
  duaId: z.string().uuid().optional().nullable(),
  bloodRequestId: z.string().uuid().optional().nullable(),
});

export const createCommentZodSchema = z.object({
  content: z
    .string({ required_error: 'Comment content is required' })
    .min(1, 'Comment content cannot be empty')
    .max(2000, 'Comment content cannot exceed 2000 characters'),
});
