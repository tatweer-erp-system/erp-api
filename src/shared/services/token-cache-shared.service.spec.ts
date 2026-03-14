import { TokenCacheSharedService } from './token-cache-shared.service';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-token-id'),
}));

describe('TokenCacheSharedService', () => {
  let service: TokenCacheSharedService;
  let cacheService: Record<string, jest.Mock>;

  const userId = 'user-001';
  const tokenId = 'token-001';
  const token = 'refresh-token-value';

  beforeEach(() => {
    cacheService = {
      refreshTokenKey: jest.fn().mockImplementation((uid, tid) => `refresh:${uid}:${tid}`),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };

    service = new TokenCacheSharedService(cacheService as any);
  });

  describe('storeRefreshToken()', () => {
    it('should store token with correct key and TTL', async () => {
      const result = await service.storeRefreshToken(userId, token);

      expect(result).toBe('mock-token-id');
      expect(cacheService.refreshTokenKey).toHaveBeenCalledWith(userId, 'mock-token-id');
      expect(cacheService.set).toHaveBeenCalledWith(
        `refresh:${userId}:mock-token-id`,
        token,
        7 * 24 * 60 * 60, // 7 days
      );
    });
  });

  describe('validateRefreshToken()', () => {
    it('should return true when stored token matches', async () => {
      cacheService.get.mockResolvedValue(token);

      const result = await service.validateRefreshToken(userId, tokenId, token);

      expect(result).toBe(true);
      expect(cacheService.refreshTokenKey).toHaveBeenCalledWith(userId, tokenId);
      expect(cacheService.get).toHaveBeenCalledWith(`refresh:${userId}:${tokenId}`);
    });

    it('should return false when token does not match', async () => {
      cacheService.get.mockResolvedValue('different-token');

      const result = await service.validateRefreshToken(userId, tokenId, token);

      expect(result).toBe(false);
    });
  });

  describe('revokeRefreshToken()', () => {
    it('should delete the specific token key', async () => {
      await service.revokeRefreshToken(userId, tokenId);

      expect(cacheService.refreshTokenKey).toHaveBeenCalledWith(userId, tokenId);
      expect(cacheService.del).toHaveBeenCalledWith(`refresh:${userId}:${tokenId}`);
    });
  });

  describe('revokeAllUserTokens()', () => {
    it('should delete all tokens for user using pattern', async () => {
      await service.revokeAllUserTokens(userId);

      expect(cacheService.delPattern).toHaveBeenCalledWith(`refresh:${userId}:*`);
    });
  });
});
