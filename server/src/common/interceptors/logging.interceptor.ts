import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.log(method, originalUrl, response.statusCode, start, request),
        error: (error: { status?: number }) =>
          this.log(method, originalUrl, error.status ?? 500, start, request),
      }),
    );
  }

  private log(
    method: string,
    url: string,
    statusCode: number,
    start: number,
    request: Request,
  ): void {
    const user = (request as Request & { user?: JwtPayload }).user;
    const duration = Date.now() - start;
    const actor = user ? `${user.type}:${user.id}` : 'anonymous';
    this.logger.log(`${method} ${url} ${statusCode} ${duration}ms — ${actor}`);
  }
}
