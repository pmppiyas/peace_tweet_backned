import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const respObj = exceptionResponse as Record<string, unknown>;
        message = (respObj.message as string) || exception.message;

        if (Array.isArray(respObj.message)) {
          errors = respObj.message;
          message = 'Validation failed';
        }
        if (respObj.error) {
          code = String(respObj.error).toUpperCase().replace(/\s+/g, '_');
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = Array.isArray(exception.meta?.target)
            ? (exception.meta?.target as string[]).join(', ')
            : typeof exception.meta?.target === 'string'
              ? exception.meta?.target
              : 'field';
          message = `A record with this ${target} already exists.`;
          code = 'DUPLICATE_RECORD';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          message =
            typeof exception.meta?.cause === 'string'
              ? (exception.meta?.cause as string)
              : 'The requested record was not found.';
          code = 'RECORD_NOT_FOUND';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          const field = exception.meta?.field_name || 'relation';
          message = `Foreign key constraint failed on ${field}. Referenced record does not exist.`;
          code = 'FOREIGN_KEY_VIOLATION';
          break;
        }
        case 'P2028': {
          status = HttpStatus.REQUEST_TIMEOUT;
          message = 'Database transaction timed out. Please try again.';
          code = 'TRANSACTION_TIMEOUT';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          message = exception.message || 'Database operation failed.';
          code = `DATABASE_ERROR_${exception.code}`;
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided for database operation.';
      code = 'DATABASE_VALIDATION_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name || 'ERROR';
    }

    if (status >= 500) {
      this.logger.error(
        `Unhandled Exception: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`Handled Exception: [${status}] [${code}] ${message}`);
    }

    response.status(status).json({
      success: false,
      message,
      code,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
