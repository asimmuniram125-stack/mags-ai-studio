import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const apiVersion = req.headers['api-version'] || 'v1';
    (req as any).apiVersion = apiVersion;
    next();
  }
}
