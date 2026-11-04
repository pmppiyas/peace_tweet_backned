import { z } from 'zod';

export const createCommentZodSchema = z.object({
  postId: z.string().uuid('Invalid post ID').optional(),
  content: z
    .string({ required_error: 'Comment content is required' })
    .min(1, 'Comment content cannot be empty')
    .max(2000, 'Comment content cannot exceed 2000 characters'),
  parentId: z.string().uuid('Invalid parent comment ID').optional().nullable(),
});

export const updateCommentZodSchema = z.object({
  content: z
    .string({ required_error: 'Comment content is required' })
    .min(1, 'Comment content cannot be empty')
    .max(2000, 'Comment content cannot exceed 2000 characters'),
});
