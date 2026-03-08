import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('redisCache.host'),
      port: this.configService.get<number>('redisCache.port'),
      lazyConnect: true,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.redis.exists(key);
    return count > 0;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  permissionKey(tenantSlug: string, userId: string): string {
    return `perm:${tenantSlug}:${userId}`;
  }

  tenantConfigKey(tenantSlug: string): string {
    return `tenant:config:${tenantSlug}`;
  }

  refreshTokenKey(userId: string, tokenId: string): string {
    return `refresh:${userId}:${tokenId}`;
  }
}
