import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { duaAudiosServices } from './dua-audios.services';

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await duaAudiosServices.create(req.params.duaId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Audio added successfully',
    data: result,
  });
});

const findAll = catchAsync(async (req: Request, res: Response) => {
  const result = await duaAudiosServices.findAllByDuaId(req.params.duaId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Audios retrieved successfully',
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await duaAudiosServices.update(req.params.duaId, req.params.audioId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Audio updated successfully',
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await duaAudiosServices.remove(req.params.duaId, req.params.audioId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Audio deleted successfully',
    data: result,
  });
});

export const duaAudiosController = {
  create,
  findAll,
  update,
  remove,
};
