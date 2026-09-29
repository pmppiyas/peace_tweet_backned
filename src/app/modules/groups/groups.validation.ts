import { GroupMemberRole, GroupVisibility, PostType } from '@prisma/client';
import { z } from 'zod';

export const createGroupZodSchema = z.object({
  name: z
    .string({ required_error: 'Group name is required' })
    .min(2, 'Group name must be at least 2 characters')
    .max(100, 'Group name cannot exceed 100 characters'),
  slug: z
    .string({ required_error: 'Group slug is required' })
    .min(2, 'Slug must be at least 2 characters')
    .max(80, 'Slug cannot exceed 80 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional(),
  visibility: z.nativeEnum(GroupVisibility).optional(),
  avatarUrl: z.string().optional(),
  coverUrl: z.string().optional(),
});

export const updateGroupZodSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(1000).optional().nullable(),
  visibility: z.nativeEnum(GroupVisibility).optional(),
  avatarUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
});

export const changeMemberRoleZodSchema = z.object({
  role: z.nativeEnum(GroupMemberRole),
});

export const createGroupPostZodSchema = z.object({
  content: z
    .string({ required_error: 'Post content is required' })
    .min(1, 'Post content cannot be empty')
    .max(5000, 'Post content cannot exceed 5000 characters'),
  type: z.nativeEnum(PostType).optional(),
  duaId: z.string().uuid().optional(),
});
