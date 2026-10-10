import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { bookmarksServices } from './bookmarks.services';

const saveDua = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bookmarksServices.saveDua(
    req.user.id,
    req.params.duaId,
    req.body?.timeSlot,
  );
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

const updateTimeSlot = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const { id, type = 'DUA', timeSlot } = req.body;
  const result = await bookmarksServices.updateTimeSlot(
    req.user.id,
    id,
    type,
    timeSlot || null,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: (result as any)?.message || 'Time slot updated successfully',
    data: result,
  });
});

const getSaved = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'page',
    'limit',
    'timeSlot',
    'type',
    'search',
  ]);
  const result = await bookmarksServices.getUnifiedSaved(req.user.id, query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved items retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSavedDuas = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'page',
    'limit',
    'timeSlot',
    'search',
  ]);
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
  updateTimeSlot,
  getSaved,
  getSavedDuas,
};
