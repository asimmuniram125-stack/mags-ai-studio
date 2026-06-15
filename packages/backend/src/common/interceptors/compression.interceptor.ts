import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompressionService } from '../../performance/compression.service';

@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  constructor(private readonly compressionService: CompressionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map(async (data) => {
        const acceptEncoding = request.headers['accept-encoding'] || '';
        const body = JSON.stringify(data);
        const buffer = Buffer.from(body);

        if (buffer.length < 1024) {
          // Don't compress small responses
          return data;
        }

        if (acceptEncoding.includes('br')) {
          const compressed = await this.compressionService.compressBrotli(buffer);
          response.setHeader('Content-Encoding', 'br');
          response.setHeader('Content-Length', compressed.length);
          response.setHeader('Vary', 'Accept-Encoding');
          return compressed.toString('utf-8');
        } else if (acceptEncoding.includes('gzip')) {
          const compressed = await this.compressionService.compressGzip(buffer);
          response.setHeader('Content-Encoding', 'gzip');
          response.setHeader('Content-Length', compressed.length);
          response.setHeader('Vary', 'Accept-Encoding');
          return compressed.toString('utf-8');
        }

        return data;
      }),
    );
  }
}
