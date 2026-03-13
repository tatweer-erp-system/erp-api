import { ClsServiceManager } from 'nestjs-cls';
import { AppClsStore } from '@/common/context/app-cls.store';

/**
 * Resolves a bilingual error message using the request language from CLS context.
 * Falls back to 'en' if no CLS context is available (e.g. during bootstrap or background jobs).
 *
 * Usage:
 *   msg(ErrorMessages.INSUFFICIENT_STOCK, product.name, available, requested)
 */
export function msg<T extends (...args: any[]) => string>(
  messageObj: { en: T; ar: T },
  ...args: Parameters<T>
): string {
  let lang: 'en' | 'ar' = 'en';
  try {
    const cls = ClsServiceManager.getClsService<AppClsStore>();
    lang = cls?.get('lang') ?? 'en';
  } catch {
    // CLS not available (bootstrap, background job) — default to 'en'
  }
  return messageObj[lang](...args);
}
