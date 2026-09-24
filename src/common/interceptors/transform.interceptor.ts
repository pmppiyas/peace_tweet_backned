import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response already has our format structure
        if (
          response &&
          typeof response === 'object' &&
          'success' in response &&
          'data' in response
        ) {
          return response;
        }

        // Check if response contains data + meta (e.g. paginated result)
        if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          'meta' in response
        ) {
          return {
            success: true,
            message: response.message || 'Data retrieved successfully',
            data: response.data,
            meta: response.meta,
          };
        }

        // Standard object or primitive return
        return {
          success: true,
          message:
            typeof response === 'object' && response?.message
              ? response.message
              : 'Request processed successfully',
          data:
            typeof response === 'object' && response?.message && Object.keys(response).length === 1
              ? undefined
              : response,
        };
      }),
    );
  }
}
