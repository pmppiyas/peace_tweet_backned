import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { envVar } from '../config/env';
import {
  handleDuplicateError,
  handlePrismaValidatonError,
  handleZodValidatonError,
} from '../helper/errorHelper';
import AppError from '../utils/appError';

export const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  let statusCode =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.statusCode === 'number'
        ? err.statusCode
        : httpStatus.INTERNAL_SERVER_ERROR;
  const success = false;
  let message = err?.response?.message || err?.message || 'Something went wrong!';
  if (Array.isArray(message)) {
    message = message.join(', ');
  }
  let errorSources: any = [];

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaValidatonError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Invalid data provided to database query.';
  } else if (err?.code === 11000) {
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
  } else if (err?.name === 'ZodError') {
    const simplifiedError = handleZodValidatonError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  res.status(statusCode).json({
    success,
    statusCode,
    message,
    errorSources,
    error: envVar.NODE_ENV === 'development' ? err : null,
  });
};
