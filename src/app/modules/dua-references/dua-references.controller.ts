import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { duaReferencesServices } from './dua-references.services';

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await duaReferencesServices.create(req.params.duaId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Reference added successfully',
    data: result,
  });
});

const findAll = catchAsync(async (req: Request, res: Response) => {
  const result = await duaReferencesServices.findAllByDuaId(req.params.duaId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'References retrieved successfully',
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await duaReferencesServices.update(
    req.params.duaId,
    req.params.referenceId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reference updated successfully',
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await duaReferencesServices.remove(req.params.duaId, req.params.referenceId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Reference deleted successfully',
    data: result,
  });
});

export const duaReferencesController = {
  create,
  findAll,
  update,
  remove,
};
