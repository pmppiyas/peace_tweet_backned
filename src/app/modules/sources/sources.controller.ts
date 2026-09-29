import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { sourcesServices } from './sources.services';

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await sourcesServices.create(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Source created successfully',
    data: result,
  });
});

const findAll = catchAsync(async (req: Request, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, [
    'page',
    'limit',
    'search',
    'type',
  ]);
  const result = await sourcesServices.findAll(query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Sources retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const findOne = catchAsync(async (req: Request, res: Response) => {
  const result = await sourcesServices.findOne(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Source details retrieved successfully',
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await sourcesServices.update(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Source updated successfully',
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await sourcesServices.remove(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Source deleted successfully',
    data: result,
  });
});

export const sourcesController = {
  create,
  findAll,
  findOne,
  update,
  remove,
};
