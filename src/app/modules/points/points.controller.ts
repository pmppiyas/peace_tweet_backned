import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { pointsServices } from './points.services';

const getMyPointsDashboard = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id || req.user?.sub;
  const result = await pointsServices.getUserPointsDashboard(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Points dashboard retrieved successfully',
    data: result,
  });
});

const getMyPointsHistory = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id || req.user?.sub;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 25;
  const result = await pointsServices.getPointsHistory(userId, page, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Points history retrieved successfully',
    meta: result.meta,
    data: result.items,
  });
});

const checkIn = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id || req.user?.sub;
  const result = await pointsServices.dailyCheckIn(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.alreadyCheckedIn
      ? 'You have already checked in today'
      : 'Daily check-in successful',
    data: result,
  });
});

const getLeaderboard = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 20;
  const result = await pointsServices.getLeaderboard(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Leaderboard retrieved successfully',
    data: result,
  });
});

const getRedeemStore = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id || req.user?.sub;
  const result = await pointsServices.getRedeemStore(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Redeem catalog retrieved successfully',
    data: result,
  });
});

const redeemReward = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id || req.user?.sub;
  const result = await pointsServices.redeemReward(
    userId,
    req.body?.code || req.body?.rewardCode,
    req.body?.deliveryInfo,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reward redeemed successfully',
    data: result,
  });
});

const toggleEquipCosmetic = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user?.id || req.user?.sub;
    const result = await pointsServices.toggleEquipCosmetic(
      userId,
      req.body?.code || req.body?.rewardCode,
      req.body?.equip !== false,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Cosmetic appearance updated',
      data: result,
    });
  },
);

export const pointsController = {
  getMyPointsDashboard,
  getMyPointsHistory,
  checkIn,
  getRedeemStore,
  redeemReward,
  toggleEquipCosmetic,
  getLeaderboard,
};
