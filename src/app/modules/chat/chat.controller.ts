import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { chatServices } from './chat.services';

const getConversations = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await chatServices.getConversations(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversations retrieved successfully',
    data: result,
  });
});

const getOrCreateConversation = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const targetId = (req.body.participantId || req.body.receiverId) as string;
  const result = await chatServices.getOrCreateConversation(req.user.id, targetId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversation retrieved successfully',
    data: result,
  });
});

const getMessages = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['cursor', 'limit']);
  const result = await chatServices.getMessages(req.params.conversationId, req.user.id, query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages retrieved successfully',
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await chatServices.saveMessage(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

const editMessage = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await chatServices.editMessage(req.user.id, req.params.messageId, req.body.text);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message updated successfully',
    data: result,
  });
});

const deleteMessage = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await chatServices.deleteMessage(req.user.id, req.params.messageId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message deleted successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await chatServices.markAsRead(req.params.conversationId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages marked as read',
    data: result,
  });
});

export const chatController = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
};
