import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { postsServices } from './posts.services';

const create = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.create(req.body, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Post created successfully',
    data: result,
  });
});

const getFeed = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'cursor',
    'limit',
    'type',
    'search',
    'authorId',
  ]);
  const result = await postsServices.getFeed(query as any, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feed items retrieved successfully',
    data: result,
  });
});

const findOne = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.findOne(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Post details retrieved successfully',
    data: result,
  });
});

const update = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.update(req.params.id, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Post updated successfully',
    data: result,
  });
});

const remove = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.remove(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Post deleted successfully',
    data: result,
  });
});

const savePost = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.savePost(req.params.postId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Post saved successfully',
    data: result,
  });
});

const unsavePost = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.unsavePost(req.params.postId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Post unsaved successfully',
    data: result,
  });
});

const react = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.react(req.params.postId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reaction added',
    data: result,
  });
});

const unreact = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.unreact(req.params.postId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reaction removed',
    data: result,
  });
});

const getComments = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const result = await postsServices.getComments(req.params.postId, limit);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Comments retrieved successfully',
    data: result,
  });
});

const createComment = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await postsServices.createComment(req.params.postId, req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Comment created successfully',
    data: result,
  });
});

export const postsController = {
  create,
  getFeed,
  findOne,
  update,
  remove,
  savePost,
  unsavePost,
  react,
  unreact,
  getComments,
  createComment,
};
