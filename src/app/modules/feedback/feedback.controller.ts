import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { feedbackServices } from './feedback.services';

const createFeedback = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id || req.user?.sub;
  const result = await feedbackServices.createFeedback(req.body, userId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Your feedback or report has been submitted successfully',
    data: result,
  });
});

const getAllFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'page',
    'limit',
    'search',
    'type',
    'status',
  ]);

  const result = await feedbackServices.getAllFeedbacks(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedback reports retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getFeedbackById = catchAsync(async (req: Request, res: Response) => {
  const result = await feedbackServices.getFeedbackById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedback report retrieved successfully',
    data: result,
  });
});

const updateFeedbackStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await feedbackServices.updateFeedbackStatus(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedback report status updated successfully',
    data: result,
  });
});

export const feedbackController = {
  createFeedback,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedbackStatus,
};
