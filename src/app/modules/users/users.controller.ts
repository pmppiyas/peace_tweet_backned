import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { usersServices } from './users.services';

const getProfile = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await usersServices.findById(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Current user profile returned successfully',
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await usersServices.update(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile updated successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await usersServices.changePassword(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getByUsername = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await usersServices.findByUsername(req.params.username, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile returned successfully',
    data: result,
  });
});

export const usersController = {
  getProfile,
  updateProfile,
  changePassword,
  getByUsername,
};
