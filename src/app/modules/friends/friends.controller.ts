import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { friendsServices } from './friends.services';

const sendRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await friendsServices.sendRequest(req.user.id, req.body.receiverId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Friend request sent successfully',
    data: result,
  });
});

const cancelRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await friendsServices.cancelRequest(req.params.requestId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Friend request cancelled successfully',
    data: result,
  });
});

const acceptRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await friendsServices.acceptRequest(req.params.requestId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Friend request accepted',
    data: result,
  });
});

const rejectRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await friendsServices.rejectRequest(req.params.requestId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Friend request rejected',
    data: result,
  });
});

const getReceivedRequests = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['cursor', 'limit']);
  const result = await friendsServices.getReceivedRequests(req.user.id, query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Received friend requests retrieved successfully',
    data: result,
  });
});

const getSentRequests = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['cursor', 'limit']);
  const result = await friendsServices.getSentRequests(req.user.id, query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Sent friend requests retrieved successfully',
    data: result,
  });
});

const getFriends = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['cursor', 'limit', 'search']);
  const result = await friendsServices.getFriends(req.user.id, query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Friends list retrieved successfully',
    data: result,
  });
});

const unfriend = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await friendsServices.unfriend(req.user.id, req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Friend removed successfully',
    data: result,
  });
});

const getStatus = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await friendsServices.getRelationshipStatus(req.user?.id, req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Relationship status retrieved successfully',
    data: result,
  });
});

export const friendsController = {
  sendRequest,
  cancelRequest,
  acceptRequest,
  rejectRequest,
  getReceivedRequests,
  getSentRequests,
  getFriends,
  unfriend,
  getStatus,
};
