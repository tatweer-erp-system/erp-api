import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_RESPONSE_KEY, CACHE_RESPONSE_TTL_KEY } from '../decorators/cache-response.decorator';
import { Request } from 'express';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const shouldCache = this.reflector.getAllAndOverride<boolean>(CACHE_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!shouldCache) return next.handle();

    const ttl =
      this.reflector.getAllAndOverride<number>(CACHE_RESPONSE_TTL_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 60;

    const request = context.switchToHttp().getRequest<Request>();
    const cacheKey = `response:${request.url}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheService.set(cacheKey, data, ttl);
      }),
    );
  }
}
