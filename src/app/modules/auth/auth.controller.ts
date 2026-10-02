import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { authServices } from './auth.services';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.register(req.body);
  if (result.accessToken) {
    res.cookie('accessToken', result.accessToken, cookieOptions);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, cookieOptions);
  }
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.login(req.body);
  if (result.accessToken) {
    res.cookie('accessToken', result.accessToken, cookieOptions);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, cookieOptions);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully',
    data: result,
  });
});

const facebookLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.facebookLogin(req.body);
  if (result.accessToken) {
    res.cookie('accessToken', result.accessToken, cookieOptions);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, cookieOptions);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Facebook login successful',
    data: result,
  });
});

const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.refreshTokens(req.body.refreshToken);
  if (result.accessToken) {
    res.cookie('accessToken', result.accessToken, cookieOptions);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, cookieOptions);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tokens refreshed successfully',
    data: result,
  });
});

const logout = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await authServices.logout(req.user.id);
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getMe = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await authServices.getMe(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile retrieved successfully',
    data: result,
  });
});

export const authController = {
  register,
  login,
  facebookLogin,
  refreshTokens,
  logout,
  getMe,
};
