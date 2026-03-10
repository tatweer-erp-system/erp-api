import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { IdempotencyCacheEntry, IdempotencyCheckResult } from '../interfaces/idempotency.interface';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly ttlSeconds: number;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.get<number>('idempotency.ttl') ?? 86400;
  }

  private buildKey(tenantSlug: string, userId: string, key: string): string {
    return `idempotency:${tenantSlug}:${userId}:${key}`;
  }

  private lockKey(tenantSlug: string, userId: string, key: string): string {
    return `idempotency_lock:${tenantSlug}:${userId}:${key}`;
  }

  async check(tenantSlug: string, userId: string, key: string): Promise<IdempotencyCheckResult> {
    const cacheKey = this.buildKey(tenantSlug, userId, key);

    const existing = await this.cacheService.get<IdempotencyCacheEntry>(cacheKey);
    if (existing) {
      return { exists: true, response: existing.response };
    }

    const lock = this.lockKey(tenantSlug, userId, key);
    const inFlight = await this.cacheService.exists(lock);
    if (inFlight) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'A request with the same idempotency key is currently being processed',
      });
    }

    await this.cacheService.set(lock, '1', 30);

    return { exists: false, inFlight: false };
  }

  async store(
    tenantSlug: string,
    userId: string,
    key: string,
    endpoint: string,
    response: unknown,
  ): Promise<void> {
    const cacheKey = this.buildKey(tenantSlug, userId, key);
    const lock = this.lockKey(tenantSlug, userId, key);

    const entry: IdempotencyCacheEntry = {
      key,
      tenantSlug,
      userId,
      endpoint,
      response,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.ttlSeconds * 1000).toISOString(),
    };

    await this.cacheService.set(cacheKey, entry, this.ttlSeconds);
    await this.cacheService.del(lock);

    this.logger.debug(`Idempotency key stored: ${key}`);
  }

  async releaseLock(tenantSlug: string, userId: string, key: string): Promise<void> {
    const lock = this.lockKey(tenantSlug, userId, key);
    await this.cacheService.del(lock);
  }
}
