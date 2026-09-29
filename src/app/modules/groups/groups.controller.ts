import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { groupsServices } from './groups.services';

const createGroup = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.createGroup(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Group created successfully',
    data: result,
  });
});

const discoverGroups = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'cursor',
    'limit',
    'search',
    'visibility',
  ]);
  const result = await groupsServices.discoverGroups(query, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Groups retrieved successfully',
    data: result,
  });
});

const getMyGroups = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'cursor',
    'limit',
    'search',
    'visibility',
  ]);
  const result = await groupsServices.getMyGroups(req.user.id, query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My groups retrieved successfully',
    data: result,
  });
});

const getGroupById = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.getGroupById(req.params.groupId, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Group details retrieved successfully',
    data: result,
  });
});

const getGroupBySlug = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.getGroupBySlug(req.params.slug, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Group details retrieved successfully',
    data: result,
  });
});

const updateGroup = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.updateGroup(req.params.groupId, req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Group updated successfully',
    data: result,
  });
});

const deleteGroup = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.deleteGroup(req.params.groupId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Group deleted successfully',
    data: result,
  });
});

const joinGroup = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.joinGroup(req.params.groupId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message || 'Group join action completed',
    data: result,
  });
});

const cancelJoinRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.cancelJoinRequest(req.params.groupId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Join request cancelled',
    data: result,
  });
});

const leaveGroup = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.leaveGroup(req.params.groupId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Left group successfully',
    data: result,
  });
});

const getMembers = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'cursor',
    'limit',
    'search',
    'role',
  ]);
  const result = await groupsServices.getMembers(req.params.groupId, query, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Group members retrieved successfully',
    data: result,
  });
});

const getJoinRequests = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['cursor', 'limit', 'search']);
  const result = await groupsServices.getJoinRequests(req.params.groupId, query, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Join requests retrieved successfully',
    data: result,
  });
});

const acceptJoinRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.acceptJoinRequest(
    req.params.groupId,
    req.params.requestId,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Join request accepted',
    data: result,
  });
});

const rejectJoinRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.rejectJoinRequest(
    req.params.groupId,
    req.params.requestId,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Join request rejected',
    data: result,
  });
});

const removeMember = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.removeMember(
    req.params.groupId,
    req.params.userId,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Member removed successfully',
    data: result,
  });
});

const changeMemberRole = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.changeMemberRole(
    req.params.groupId,
    req.params.userId,
    req.body.role,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Member role changed successfully',
    data: result,
  });
});

const getMembershipStatus = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.getMembershipStatus(req.params.groupId, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Membership status retrieved successfully',
    data: result,
  });
});

const getGroupPosts = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['cursor', 'limit', 'search']);
  const result = await groupsServices.getGroupPosts(req.params.groupId, query, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Group posts retrieved successfully',
    data: result,
  });
});

const createGroupPost = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await groupsServices.createGroupPost(req.params.groupId, req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Group post created successfully',
    data: result,
  });
});

export const groupsController = {
  createGroup,
  discoverGroups,
  getMyGroups,
  getGroupById,
  getGroupBySlug,
  updateGroup,
  deleteGroup,
  joinGroup,
  cancelJoinRequest,
  leaveGroup,
  getMembers,
  getJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  removeMember,
  changeMemberRole,
  getMembershipStatus,
  getGroupPosts,
  createGroupPost,
};
