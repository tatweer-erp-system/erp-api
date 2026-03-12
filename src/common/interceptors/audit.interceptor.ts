import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuthenticatedRequest } from '../types/request.types';

const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!WRITE_METHODS.includes(request.method)) {
      return next.handle();
    }

    const user = request.user;
    if (!user) return next.handle();

    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket?.remoteAddress ||
      '';
    const userAgent = request.headers['user-agent'] ?? '';
    const requestId = (request.headers['x-request-id'] as string) ?? '';
    const entity = this.extractEntity(request.path);

    return next.handle().pipe(
      tap((responseData) => {
        const entityId = this.extractEntityId(responseData);
        void this.auditService.log({
          tenantSlug: user.tenantSlug,
          userId: user.id,
          action: request.method,
          entity,
          entityId,
          newValues: responseData as Record<string, unknown>,
          ipAddress: ip,
          userAgent,
          requestId,
        });
      }),
    );
  }

  private extractEntity(path: string): string {
    const segments = path.replace('/api/v1/', '').split('/');
    return segments[0] ?? 'unknown';
  }

  private extractEntityId(data: unknown): string | undefined {
    if (data && typeof data === 'object' && 'id' in data) {
      return (data as { id: string }).id;
    }
    if (data && typeof data === 'object' && 'data' in data) {
      const inner = (data as { data: unknown }).data;
      if (inner && typeof inner === 'object' && 'id' in inner) {
        return (inner as { id: string }).id;
      }
    }
    return undefined;
  }
}
