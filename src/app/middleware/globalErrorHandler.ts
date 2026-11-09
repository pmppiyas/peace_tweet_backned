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
  let message = 'Something went wrong. Please try again.';
  let errorSources: any = [];

  // Log full internal error on server console for developers/observability
  console.error(`[Backend Error] [${req.method}] ${req.originalUrl}:`, err?.message || err);

  const isPrismaError =
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err?.name?.includes?.('Prisma') ||
    (typeof err?.message === 'string' &&
      (err.message.includes('prisma.') || err.message.includes('PrismaClient')));

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaValidatonError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
  } else if (isPrismaError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Invalid data provided for database operation.';
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
    // Trusted operational error with user-safe message
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    // Untrusted runtime or library error: Never leak file paths or stack traces!
    const rawMsg = err.message || '';
    const hasSensitiveTraces =
      rawMsg.includes('\n') ||
      rawMsg.includes('\\') ||
      rawMsg.includes('/') ||
      rawMsg.includes('.ts:') ||
      rawMsg.includes('.js:') ||
      rawMsg.includes('invocation in');

    if (!hasSensitiveTraces && rawMsg.length > 0 && rawMsg.length < 150) {
      message = rawMsg;
    } else {
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected server error occurred. Please try again.';
    }
  }

  res.status(statusCode).json({
    success,
    statusCode,
    message,
    errorSources,
    error:
      envVar.NODE_ENV === 'development'
        ? { name: err?.name, message: message }
        : null,
  });
};
