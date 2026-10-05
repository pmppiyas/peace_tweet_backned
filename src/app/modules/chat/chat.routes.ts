import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { chatController } from './chat.controller';
import {
  editMessageSchema,
  getOrCreateConversationSchema,
  sendMessageSchema,
} from './chat.validation';

const router = Router();

// Conversation endpoints
router.get('/conversations', checkAuth(), chatController.getConversations);

router.post(
  '/conversations',
  checkAuth(),
  validateRequest(getOrCreateConversationSchema),
  chatController.getOrCreateConversation,
);

// Message fetching (supports both /messages/:conversationId and /conversations/:conversationId/messages)
router.get(
  '/messages/:conversationId',
  checkAuth(),
  chatController.getMessages,
);

router.get(
  '/conversations/:conversationId/messages',
  checkAuth(),
  chatController.getMessages,
);

// Message sending
router.post(
  '/messages',
  checkAuth(),
  validateRequest(sendMessageSchema),
  chatController.sendMessage,
);

// Message editing & deleting
router.patch(
  '/messages/:messageId',
  checkAuth(),
  validateRequest(editMessageSchema),
  chatController.editMessage,
);

router.delete(
  '/messages/:messageId',
  checkAuth(),
  chatController.deleteMessage,
);

// Mark as read (supports both routes)
router.patch(
  '/messages/:conversationId/read',
  checkAuth(),
  chatController.markAsRead,
);

router.patch(
  '/conversations/:conversationId/read',
  checkAuth(),
  chatController.markAsRead,
);

export const chatRoutes = router;
