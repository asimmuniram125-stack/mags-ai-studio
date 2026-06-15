import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorTrackingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        const errorData = {
          message: error.message,
          statusCode: error.status || 500,
          path: request.path,
          method: request.method,
          timestamp: new Date().toISOString(),
          requestId: request.headers['x-request-id'],
          userId: request.user?.id,
          stack: error.stack,
        };

        console.error('[ERROR]', JSON.stringify(errorData));

        // Send to error tracking service (Sentry)
        // captureException(error);

        return throwError(() => error);
      }),
    );
  }
}
