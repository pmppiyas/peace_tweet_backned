import { z } from 'zod';

export const sendFriendRequestZodSchema = z.object({
  receiverId: z
    .string({ required_error: 'receiverId is required' })
    .uuid('receiverId must be a valid UUID'),
});
