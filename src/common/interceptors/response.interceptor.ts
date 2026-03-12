import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SupportedLanguage } from '../types/i18n.types';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const lang = this.resolveLang(request);

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        const flattened = this.flattenLocalized(data, lang) as
          | Record<string, unknown>
          | null
          | undefined;

        return {
          success: true,
          data: flattened?.data ?? flattened,
          meta: flattened?.meta,
          timestamp: new Date().toISOString(),
          lang,
        };
      }),
    );
  }

  private resolveLang(request: Request): SupportedLanguage {
    const accept = request.headers['accept-language'] ?? 'en';
    return accept.startsWith('ar') ? 'ar' : 'en';
  }

  private flattenLocalized(data: unknown, lang: SupportedLanguage): unknown {
    if (!data || typeof data !== 'object') return data;
    if (data instanceof Date) return data.toISOString();

    if (Array.isArray(data)) {
      return data.map((item) => this.flattenLocalized(item, lang));
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'en' in value &&
        'ar' in value
      ) {
        result[key] =
          (value as Record<string, string>)[lang] ?? (value as Record<string, string>)['en'];
      } else {
        result[key] = this.flattenLocalized(value, lang);
      }
    }
    return result;
  }
}
