import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ErrorTrackerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const oldJson = res.json;
    res.json = function (data) {
      if (res.statusCode >= 400) {
        console.error({
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          error: data,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
      return oldJson.call(this, data);
    };
    next();
  }
}
