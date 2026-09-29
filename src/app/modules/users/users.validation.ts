import { BloodGroup } from '@prisma/client';
import { z } from 'zod';

export const updateUserZodSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  bloodGroup: z.nativeEnum(BloodGroup).optional().nullable(),
});

export const changePasswordZodSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(6, 'New password must be at least 6 characters long')
    .max(50, 'New password cannot exceed 50 characters'),
});
