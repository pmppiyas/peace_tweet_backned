import { FeedbackStatus, FeedbackType } from '@prisma/client';
import { z } from 'zod';

export const createFeedbackZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty').max(100),
    email: z.string({ required_error: 'Email is required' }).email('Valid email address is required'),
    type: z.nativeEnum(FeedbackType).optional().default(FeedbackType.SUGGESTION),
    subject: z.string({ required_error: 'Subject is required' }).min(3, 'Subject must be at least 3 characters').max(200),
    description: z.string({ required_error: 'Description is required' }).min(10, 'Description must be at least 10 characters').max(5000),
    mediaUrls: z.array(z.string().url('Invalid media URL')).optional().default([]),
  }),
});

export const updateFeedbackStatusZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(FeedbackStatus, { required_error: 'Status is required' }),
    adminNote: z.string().max(1000).optional(),
  }),
});
