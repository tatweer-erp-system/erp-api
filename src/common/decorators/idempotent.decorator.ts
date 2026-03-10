import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

/**
 * Marks an endpoint as requiring idempotency key support.
 * IdempotencyInterceptor checks for `Idempotency-Key` header on marked endpoints.
 *
 * @example @Idempotent()
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
