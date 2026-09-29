import { Prisma } from '@prisma/client';
import httpStatus from 'http-status-codes';

export const handlePrismaValidatonError = (error: Prisma.PrismaClientKnownRequestError) => {
  let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Database operation failed.';

  switch (error.code) {
    case 'P2025': {
      statusCode = httpStatus.NOT_FOUND;
      message =
        typeof error.meta?.cause === 'string'
          ? error.meta.cause
          : 'The requested record was not found.';
      break;
    }
    case 'P2002': {
      statusCode = httpStatus.CONFLICT;
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : typeof error.meta?.target === 'string'
          ? error.meta.target
          : 'field';
      message = `A record with this ${target} already exists.`;
      break;
    }
    case 'P2028': {
      statusCode = httpStatus.REQUEST_TIMEOUT;
      message = 'Database transaction timed out. Please try again.';
      break;
    }
    default: {
      statusCode = httpStatus.BAD_REQUEST;
      message = error.message || 'Database request error.';
      break;
    }
  }

  return { statusCode, message };
};

export const handleZodValidatonError = (err: any) => {
  const errorSources = err.issues.map((issue: any) => ({
    path: issue.path[issue.path.length - 1],
    message: issue.message,
  }));

  return {
    statusCode: 400,
    message: errorSources[0]?.message || 'Zod Validation Error',
    errorSources,
  };
};

export const handleDuplicateError = (err: any) => {
  const matchedArray = err.message.match(/"([^"]*)"/);
  return {
    statusCode: 400,
    message: `${matchedArray?.[1] || 'Value'} already exists!`,
  };
};
