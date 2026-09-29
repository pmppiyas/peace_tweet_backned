import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { queryPick } from '../../utils/queryPick';
import { sendResponse } from '../../utils/sendResponse';
import { categoriesServices } from './categories.services';

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await categoriesServices.create(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Category created successfully',
    data: result,
  });
});

const findAll = catchAsync(async (req: Request, res: Response) => {
  const query = queryPick(req.query as Record<string, unknown>, ['page', 'limit', 'search']);
  const result = await categoriesServices.findAll(query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Categories retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const findOne = catchAsync(async (req: Request, res: Response) => {
  const result = await categoriesServices.findOne(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category retrieved successfully',
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await categoriesServices.update(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category updated successfully',
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await categoriesServices.remove(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Category deleted successfully',
    data: result,
  });
});

export const categoriesController = {
  create,
  findAll,
  findOne,
  update,
  remove,
};
