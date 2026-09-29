import { BloodGroup } from '@prisma/client';
import { z } from 'zod';

export const registerZodSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username must not exceed 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain alphanumeric characters, underscores and hyphens',
    )
    .optional(),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long')
    .max(50, 'Password cannot exceed 50 characters'),
  avatarUrl: z.string().optional(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').optional(),
  bloodGroup: z.nativeEnum(BloodGroup).optional(),
});

export const loginZodSchema = z.object({
  identifier: z
    .string({ required_error: 'Email or username is required' })
    .min(1, 'Email or username is required'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const refreshTokenZodSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(1, 'Refresh token is required'),
});

export const facebookLoginZodSchema = z
  .object({
    accessToken: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    redirectUri: z.string().url().optional(),
  })
  .refine((data) => Boolean(data.accessToken || data.code), {
    message: 'Either Facebook authorization code or accessToken is required',
  });
