import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { bookmarksServices } from './bookmarks.services';

const saveDua = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bookmarksServices.saveDua(req.user.id, req.params.duaId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message || 'Dua saved successfully',
    data: result,
  });
});

const unsaveDua = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bookmarksServices.unsaveDua(req.user.id, req.params.duaId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Dua unsaved successfully',
    data: result,
  });
});

const getSavedDuas = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['page', 'limit']);
  const result = await bookmarksServices.getSavedDuas(req.user.id, query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved Duas retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const bookmarksController = {
  saveDua,
  unsaveDua,
  getSavedDuas,
};
