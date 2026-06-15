import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
@Injectable()
export class GlobalErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message
          : exceptionResponse;
      errorDetails = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      message,
      path: request.path,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'] || 'unknown',
      ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
    };

    console.error('[GLOBAL ERROR]', JSON.stringify(errorResponse));

    response.status(status).json(errorResponse);
  }
}
