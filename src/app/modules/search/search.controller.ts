import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { searchServices } from './search.services';
import { SearchScope } from './search.interface';

const searchGlobal = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const type = (req.query.type as SearchScope) || 'ALL';
  const limit = req.query.limit ? Number(req.query.limit) : 8;

  const result = await searchServices.searchGlobal({
    q,
    type,
    limit,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Search results retrieved successfully',
    data: result,
  });
});

const getSearchHistory = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const result = await searchServices.getSearchHistory(req.user.id, limit);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Recent searches retrieved successfully',
      data: result,
    });
  },
);

const addSearchHistory = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const result = await searchServices.addSearchHistory(req.user.id, req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Search query added to history',
      data: result,
    });
  },
);

const deleteSearchHistoryItem = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { id } = req.params;
    await searchServices.deleteSearchHistoryItem(req.user.id, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Search history item deleted successfully',
      data: { id },
    });
  },
);

const clearSearchHistory = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    await searchServices.clearSearchHistory(req.user.id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All search history cleared successfully',
      data: null,
    });
  },
);

export const searchController = {
  searchGlobal,
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory,
};
