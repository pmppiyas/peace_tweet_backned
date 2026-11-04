import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { commentsServices } from './comments.services';

const getComments = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const postId = (req.params.postId || req.query.postId) as string;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const result = await commentsServices.getCommentsByPost(
      postId,
      limit,
      req.user,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Comments retrieved successfully',
      data: result,
    });
  },
);

const findOne = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const commentId = req.params.commentId || req.params.id;
    const result = await commentsServices.findOne(commentId, req.user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Comment retrieved successfully',
      data: result,
    });
  },
);

const createComment = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const postId = req.params.postId || req.body?.postId;
    const parentId = req.params.commentId || req.body?.parentId || null;
    const payload = {
      ...req.body,
      postId,
      parentId,
    };
    const result = await commentsServices.createComment(
      postId,
      req.user.id,
      payload,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: parentId
        ? 'Reply created successfully'
        : 'Comment created successfully',
      data: result,
    });
  },
);

const updateComment = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const commentId = req.params.commentId || req.params.id;
    const result = await commentsServices.updateComment(
      commentId,
      req.user.id,
      req.body,
      req.user.role,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message || 'Comment updated successfully',
      data: result,
    });
  },
);

const deleteComment = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const commentId = req.params.commentId || req.params.id;
    const result = await commentsServices.deleteComment(commentId, req.user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message || 'Comment deleted successfully',
      data: result,
    });
  },
);

export const commentsController = {
  getComments,
  findOne,
  createComment,
  updateComment,
  deleteComment,
};
