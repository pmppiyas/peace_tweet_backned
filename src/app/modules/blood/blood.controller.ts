import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { bloodServices } from './blood.services';

const createRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bloodServices.createBloodRequest(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Blood request created successfully',
    data: result,
  });
});

const getAllRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await bloodServices.getAllBloodRequests(req.query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blood requests retrieved successfully',
    data: result,
  });
});

const getRequestById = catchAsync(async (req: Request, res: Response) => {
  const result = await bloodServices.getBloodRequestById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blood request details retrieved successfully',
    data: result,
  });
});

const acceptRequest = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bloodServices.acceptBloodRequest(
    req.params.id,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Thank you! You have accepted to donate blood for this request',
    data: result,
  });
});

const completeDonation = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bloodServices.completeDonation(
    req.params.id,
    req.params.donationId,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blood donation confirmed and marked as completed successfully',
    data: result,
  });
});

const cancelDonation = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bloodServices.cancelDonation(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const updateRequestStatus = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bloodServices.updateBloodRequestStatus(
    req.params.id,
    req.user.id,
    req.body.status,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blood request status updated successfully',
    data: result,
  });
});

const getDonorModeStatus = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bloodServices.getDonorModeStatus(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Donor status retrieved successfully',
    data: result,
  });
});

const toggleDonorMode = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await bloodServices.toggleDonorMode(
    req.user.id,
    req.body?.isDonor,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Blood donor mode ${result.isDonor ? 'activated' : 'deactivated'} successfully`,
    data: result,
  });
});

const getAvailableDonors = catchAsync(async (req: Request, res: Response) => {
  const result = await bloodServices.getAvailableDonors(req.query as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Available blood donors retrieved successfully',
    data: result,
  });
});

export const bloodController = {
  createRequest,
  getAllRequests,
  getRequestById,
  acceptRequest,
  completeDonation,
  cancelDonation,
  updateRequestStatus,
  toggleDonorMode,
  getDonorModeStatus,
  getAvailableDonors,
};
