// Mock uuid before any imports that depend on it (BaseEntity uses uuid)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UnifiedSettingsService } from './unified-settings.service';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { SystemSettingsRepository } from '@/database/sql/repositories/system-settings.repository';

describe('UnifiedSettingsService', () => {
  let service: UnifiedSettingsService;

  const mockTenantSettingsRepo = {
    findByKeyTenant: jest.fn(),
    upsertSetting: jest.fn(),
  };

  const mockSystemSettingsRepo = {
    findByKeySettings: jest.fn(),
    upsertSetting: jest.fn(),
  };

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedSettingsService,
        {
          provide: TenantSettingsRepository,
          useValue: mockTenantSettingsRepo,
        },
        {
          provide: SystemSettingsRepository,
          useValue: mockSystemSettingsRepo,
        },
      ],
    }).compile();

    service = module.get<UnifiedSettingsService>(UnifiedSettingsService);
    // Clear internal cache before each test
    (service as any).cache.clear();
  });

  describe('get()', () => {
    it('should return tenant value when it exists', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'myKey',
        value: 'tenantValue',
      });

      const result = await service.get(tenantId, 'myKey');

      expect(result).toBe('tenantValue');
      expect(mockSystemSettingsRepo.findByKeySettings).not.toHaveBeenCalled();
    });

    it('should fall back to system value when tenant setting is missing', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue({
        key: 'myKey',
        value: 'systemValue',
      });

      const result = await service.get(tenantId, 'myKey');

      expect(result).toBe('systemValue');
    });

    it('should return defaultValue when both tenant and system are missing', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.get(tenantId, 'myKey', 'fallback');

      expect(result).toBe('fallback');
    });

    it('should return null when no value and no default', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.get(tenantId, 'myKey');

      expect(result).toBeNull();
    });

    it('should cache values — second call does not hit DB', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'myKey',
        value: 'cachedValue',
      });

      await service.get(tenantId, 'myKey');
      await service.get(tenantId, 'myKey');

      expect(mockTenantSettingsRepo.findByKeyTenant).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after TTL', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'myKey',
        value: 'value1',
      });

      await service.get(tenantId, 'myKey');

      // Simulate cache expiration by manipulating the expiresAt
      const cacheKey = `${tenantId}:myKey`;
      const cached = (service as any).cache.get(cacheKey);
      cached.expiresAt = Date.now() - 1;

      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'myKey',
        value: 'value2',
      });

      const result = await service.get(tenantId, 'myKey');

      expect(result).toBe('value2');
      expect(mockTenantSettingsRepo.findByKeyTenant).toHaveBeenCalledTimes(2);
    });
  });

  describe('getNumber()', () => {
    it('should return parsed number', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'count',
        value: '42',
      });

      const result = await service.getNumber(tenantId, 'count');

      expect(result).toBe(42);
    });

    it('should throw on non-numeric value', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'count',
        value: 'not-a-number',
      });

      await expect(service.getNumber(tenantId, 'count')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return defaultValue when missing', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.getNumber(tenantId, 'count', 99);

      expect(result).toBe(99);
    });

    it('should throw when missing and no default', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      await expect(service.getNumber(tenantId, 'count')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle decimal numbers', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'rate',
        value: '15.5',
      });

      const result = await service.getNumber(tenantId, 'rate');

      expect(result).toBe(15.5);
    });
  });

  describe('getBoolean()', () => {
    it.each([
      ['true', true],
      ['1', true],
      ['yes', true],
      ['TRUE', true],
      ['Yes', true],
    ])(
      'should return true for "%s"',
      async (input: string, expected: boolean) => {
        mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
          key: 'flag',
          value: input,
        });

        const result = await service.getBoolean(tenantId, 'flag');

        expect(result).toBe(expected);
      },
    );

    it.each([
      ['false', false],
      ['0', false],
      ['no', false],
      ['anything', false],
    ])(
      'should return false for "%s"',
      async (input: string, expected: boolean) => {
        mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
          key: 'flag',
          value: input,
        });

        const result = await service.getBoolean(tenantId, 'flag');

        expect(result).toBe(expected);
      },
    );

    it('should return defaultValue when missing', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.getBoolean(tenantId, 'flag', true);

      expect(result).toBe(true);
    });

    it('should return false when missing and no default', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.getBoolean(tenantId, 'flag');

      expect(result).toBe(false);
    });
  });

  describe('getJson()', () => {
    it('should parse JSON correctly', async () => {
      const jsonObj = { threshold: 100, enabled: true };
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'config',
        value: JSON.stringify(jsonObj),
      });

      const result = await service.getJson(tenantId, 'config');

      expect(result).toEqual(jsonObj);
    });

    it('should return defaultValue on invalid JSON', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'config',
        value: 'not valid json {{{',
      });

      await expect(
        service.getJson(tenantId, 'config', { fallback: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return defaultValue when missing', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.getJson(tenantId, 'config', {
        default: true,
      });

      expect(result).toEqual({ default: true });
    });

    it('should return null when missing and no default', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.getJson(tenantId, 'config');

      expect(result).toBeNull();
    });

    it('should parse JSON arrays', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'list',
        value: '[1, 2, 3]',
      });

      const result = await service.getJson<number[]>(tenantId, 'list');

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('getMany()', () => {
    it('should return map of key to value', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockImplementation(
        (_tid: string, key: string) => {
          const map: Record<string, string> = {
            keyA: 'valueA',
            keyB: 'valueB',
          };
          return Promise.resolve(
            map[key] ? { key, value: map[key] } : null,
          );
        },
      );
      mockSystemSettingsRepo.findByKeySettings.mockResolvedValue(null);

      const result = await service.getMany(tenantId, [
        'keyA',
        'keyB',
        'keyC',
      ]);

      expect(result).toEqual({
        keyA: 'valueA',
        keyB: 'valueB',
        keyC: null,
      });
    });
  });

  describe('invalidate() / invalidateTenant()', () => {
    it('invalidate() should clear cache for a specific key, next get() hits DB', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'myKey',
        value: 'original',
      });

      await service.get(tenantId, 'myKey');
      expect(mockTenantSettingsRepo.findByKeyTenant).toHaveBeenCalledTimes(1);

      service.invalidate(tenantId, 'myKey');

      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue({
        key: 'myKey',
        value: 'updated',
      });

      const result = await service.get(tenantId, 'myKey');

      expect(result).toBe('updated');
      expect(mockTenantSettingsRepo.findByKeyTenant).toHaveBeenCalledTimes(2);
    });

    it('invalidateTenant() should clear all cached keys for a tenant', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockImplementation(
        (_tid: string, key: string) =>
          Promise.resolve({ key, value: `val-${key}` }),
      );

      await service.get(tenantId, 'key1');
      await service.get(tenantId, 'key2');

      service.invalidateTenant(tenantId);

      await service.get(tenantId, 'key1');
      await service.get(tenantId, 'key2');

      // Each key should be fetched twice (once before invalidation, once after)
      expect(mockTenantSettingsRepo.findByKeyTenant).toHaveBeenCalledTimes(4);
    });

    it('invalidateTenant("*") should clear the entire cache', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockImplementation(
        (_tid: string, key: string) =>
          Promise.resolve({ key, value: `val-${key}` }),
      );

      await service.get('tenant-A', 'key1');
      await service.get('tenant-B', 'key2');

      service.invalidateTenant('*');

      await service.get('tenant-A', 'key1');
      await service.get('tenant-B', 'key2');

      expect(mockTenantSettingsRepo.findByKeyTenant).toHaveBeenCalledTimes(4);
    });
  });
});
