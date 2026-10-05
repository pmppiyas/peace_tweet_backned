import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  receiverId: z.string({ required_error: 'Valid receiver user ID is required' }),
  text: z.string().min(1, 'Message text cannot be empty').max(2000, 'Message text is too long'),
});

export const editMessageSchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty').max(2000, 'Message text is too long'),
});

export const getOrCreateConversationSchema = z
  .object({
    participantId: z.string().optional(),
    receiverId: z.string().optional(),
  })
  .refine((data) => Boolean(data.participantId || data.receiverId), {
    message: 'Valid participant or receiver user ID is required',
  });
