import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { envVar } from '../config/env';
import { prisma } from '../config/prisma';
import { verifyToken } from '../helper/verifyToken';
import AppError from '../utils/appError';

export const checkAuth =
  (...authRoles: string[]) =>
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.cookies?.accessToken || authHeader;

      if (!accessToken) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'No Token Provided');
      }

      const verifiedToken = verifyToken(accessToken, envVar.JWT_SOLT) as JwtPayload;

      const userId = (
        verifiedToken?.id ||
        verifiedToken?.sub ||
        (verifiedToken as any)?.userId ||
        (verifiedToken as any)?._id
      ) as string;

      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid authentication session. Please sign in again.');
      }

      const isUserExist = await prisma.user.findUnique({
        where: { id: userId.trim() },
      });

      if (!isUserExist) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'User does not exist!');
      }

      if ((isUserExist as any).status === 'INACTIVE' || (isUserExist as any).status === 'BLOCKED') {
        throw new AppError(httpStatus.UNAUTHORIZED, `User account is inactive`);
      }

      if (authRoles.length && !authRoles.includes(verifiedToken.role)) {
        throw new AppError(httpStatus.FORBIDDEN, 'You are not permitted to access this route!');
      }

      req.user = {
        ...verifiedToken,
        id: userId,
        sub: userId,
        role: isUserExist.role,
        email: isUserExist.email,
        username: isUserExist.username,
      };
      next();
    } catch (error) {
      next(error);
    }
  };

export const optionalAuth =
  () => async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.cookies?.accessToken;

      if (!accessToken) {
        return next();
      }

      const verifiedToken = verifyToken(accessToken, envVar.JWT_SOLT) as JwtPayload;
      const userId = (
        verifiedToken?.id ||
        verifiedToken?.sub ||
        (verifiedToken as any)?.userId ||
        (verifiedToken as any)?._id
      ) as string;

      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        req.user = {
          ...verifiedToken,
          id: userId.trim(),
          sub: userId.trim(),
        };
      }
      next();
    } catch {
      // Ignore invalid token on optional public endpoints
      next();
    }
  };
