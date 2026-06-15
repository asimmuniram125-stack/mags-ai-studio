import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly slowThreshold = 1000; // 1 second

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    request.headers['x-request-id'] = requestId;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        response.setHeader('x-response-time', `${duration}ms`);
        response.setHeader('x-request-id', requestId);

        if (duration > this.slowThreshold) {
          console.warn(
            `[SLOW] ${request.method} ${request.path} - ${duration}ms (Request ID: ${requestId})`,
          );
        }
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
