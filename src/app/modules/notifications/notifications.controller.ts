import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { notificationsServices } from './notifications.services';

const getNotifications = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['page', 'limit', 'isRead']);
  const result = await notificationsServices.getNotifications(req.user.id, query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getUnreadCount = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await notificationsServices.getUnreadCount(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unread count retrieved successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await notificationsServices.markAsRead(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await notificationsServices.markAllAsRead(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: result,
  });
});

const remove = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await notificationsServices.remove(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification deleted successfully',
    data: result,
  });
});

export const notificationsController = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  remove,
};
