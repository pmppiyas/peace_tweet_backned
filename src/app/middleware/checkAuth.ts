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

      const userId = (verifiedToken.id || verifiedToken.sub) as string;

      const isUserExist = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!isUserExist) {
        throw new AppError(httpStatus.BAD_REQUEST, 'User does not exist!');
      }

      if (isUserExist.status === 'INACTIVE') {
        throw new AppError(httpStatus.BAD_REQUEST, `User is ${isUserExist.status}`);
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
      const userId = (verifiedToken.id || verifiedToken.sub) as string;

      if (userId) {
        req.user = {
          ...verifiedToken,
          id: userId,
          sub: userId,
        };
      }
      next();
    } catch {
      // Ignore invalid token on optional public endpoints
      next();
    }
  };
