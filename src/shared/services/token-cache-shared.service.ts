import { Injectable } from '@nestjs/common';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

@Injectable()
export class TokenCacheSharedService {
  constructor(private readonly cacheService: CacheService) {}

  async storeRefreshToken(userId: string, token: string): Promise<string> {
    const tokenId = uuidv4();
    const key = this.cacheService.refreshTokenKey(userId, tokenId);
    await this.cacheService.set(key, token, REFRESH_TTL);
    return tokenId;
  }

  async validateRefreshToken(userId: string, tokenId: string, token: string): Promise<boolean> {
    const key = this.cacheService.refreshTokenKey(userId, tokenId);
    const stored = await this.cacheService.get<string>(key);
    return stored === token;
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = this.cacheService.refreshTokenKey(userId, tokenId);
    await this.cacheService.del(key);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.cacheService.delPattern(`refresh:${userId}:*`);
  }
}
