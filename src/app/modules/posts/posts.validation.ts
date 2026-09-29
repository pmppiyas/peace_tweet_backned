import { PostStatus, PostType, PostVisibility } from '@prisma/client';
import { z } from 'zod';

export const createPostZodSchema = z.object({
  content: z
    .string({ required_error: 'Post content is required' })
    .min(1, 'Post content cannot be empty')
    .max(5000, 'Post content cannot exceed 5000 characters'),
  type: z.nativeEnum(PostType).optional(),
  visibility: z.nativeEnum(PostVisibility).optional(),
  status: z.nativeEnum(PostStatus).optional(),
  duaId: z.string().uuid().optional(),
});

export const updatePostZodSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  type: z.nativeEnum(PostType).optional(),
  visibility: z.nativeEnum(PostVisibility).optional(),
  status: z.nativeEnum(PostStatus).optional(),
  duaId: z.string().uuid().optional().nullable(),
});

export const createCommentZodSchema = z.object({
  content: z
    .string({ required_error: 'Comment content is required' })
    .min(1, 'Comment content cannot be empty')
    .max(2000, 'Comment content cannot exceed 2000 characters'),
});
