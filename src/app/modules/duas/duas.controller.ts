import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { duasServices } from './duas.services';

const create = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await duasServices.create(req.body, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Dua created successfully',
    data: result,
  });
});

const findAll = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'page',
    'limit',
    'search',
    'categoryId',
    'status',
  ]);
  const result = await duasServices.findAll(query, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Duas list retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const findOne = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await duasServices.findOne(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dua details retrieved successfully',
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await duasServices.update(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dua updated successfully',
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await duasServices.remove(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Dua deleted successfully',
    data: result,
  });
});

export const duasController = {
  create,
  findAll,
  findOne,
  update,
  remove,
};
