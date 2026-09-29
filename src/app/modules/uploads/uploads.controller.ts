import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { uploadsServices } from './uploads.services';

const uploadImage = catchAsync(async (req: Request, res: Response) => {
  const result = await uploadsServices.uploadImage(req.file, 'peacetweet/uploads');
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Image uploaded successfully',
    data: result,
  });
});

const uploadAvatar = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const folder = req.user ? `peacetweet/avatars/${req.user.id}` : 'peacetweet/avatars';
  const result = await uploadsServices.uploadImage(req.file, folder);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Avatar uploaded successfully',
    data: result,
  });
});

export const uploadsController = {
  uploadImage,
  uploadAvatar,
};
