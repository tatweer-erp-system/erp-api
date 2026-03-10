import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';
import { IdempotencySharedService } from '@/shared/services/idempotency-shared.service';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencySharedService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const idempotencyKey = request.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required for this endpoint',
      });
    }

    const tenantSlug = request.tenantSlug;
    const userId = (request as any).user?.id;
    const endpoint = `${request.method} ${request.path}`;

    const result = await this.idempotencyService.check(tenantSlug, userId, idempotencyKey);

    if (result.exists) {
      return of(result.response);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.idempotencyService.store(tenantSlug, userId, idempotencyKey, endpoint, response);
      }),
      catchError(async (error) => {
        await this.idempotencyService.releaseLock(tenantSlug, userId, idempotencyKey);
        throw error;
      }),
    );
  }
}
