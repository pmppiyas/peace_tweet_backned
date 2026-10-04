import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { sharesServices } from './shares.services';

const createShare = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await sharesServices.createShare(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message || 'Shared successfully',
    data: result,
  });
});

const getShares = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await sharesServices.getShares({
    contentType: req.query.contentType as any,
    contentId: req.query.contentId as string,
    limit: req.query.limit ? Number(req.query.limit) : 20,
    cursor: req.query.cursor as string,
    userId: req.query.userId as string || (req.query.me === 'true' ? req.user?.id : undefined),
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shares retrieved successfully',
    data: result,
  });
});

const deleteShare = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await sharesServices.deleteShare(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Share deleted successfully',
    data: result,
  });
});

export const sharesController = {
  createShare,
  getShares,
  deleteShare,
};
