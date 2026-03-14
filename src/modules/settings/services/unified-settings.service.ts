import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { SystemSettingsRepository } from '@/database/sql/repositories/system-settings.repository';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class UnifiedSettingsService {
  private readonly cache = new Map<string, { value: string | null; expiresAt: number }>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly tenantSettingsRepo: TenantSettingsRepository,
    private readonly systemSettingsRepo: SystemSettingsRepository,
  ) {}

  /**
   * Get value — tries tenant first, falls back to system, then defaultValue.
   */
  async get(tenantId: string, key: string, defaultValue?: string): Promise<string | null> {
    const cacheKey = `${tenantId}:${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value ?? defaultValue ?? null;
    }

    // Try tenant first
    const tenantRow = await this.tenantSettingsRepo.findByKeyTenant(tenantId, key);
    if (tenantRow !== null && tenantRow !== undefined) {
      const value = tenantRow.value ?? null;
      this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.TTL_MS });
      return value ?? defaultValue ?? null;
    }

    // Fall back to system
    const systemRow = await this.systemSettingsRepo.findByKeySettings(key);
    const value = systemRow?.value ?? null;
    this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.TTL_MS });
    return value ?? defaultValue ?? null;
  }

  /**
   * Get as number. Throws BadRequestException if value is not numeric.
   */
  async getNumber(tenantId: string, key: string, defaultValue?: number): Promise<number> {
    const raw = await this.get(tenantId, key);
    if (raw === null || raw === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new BadRequestException(msg(ErrorMessages.SETTING_NOT_CONFIGURED, key));
    }
    const num = Number(raw);
    if (isNaN(num)) {
      throw new BadRequestException(
        msg(ErrorMessages.SETTING_INVALID_VALUE, key, raw, 'a numeric value'),
      );
    }
    return num;
  }

  /**
   * Get as boolean. 'true' | '1' | 'yes' -> true. Everything else -> false.
   */
  async getBoolean(tenantId: string, key: string, defaultValue?: boolean): Promise<boolean> {
    const raw = await this.get(tenantId, key);
    if (raw === null || raw === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      return false;
    }
    const lower = raw.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  /**
   * Get as parsed JSON.
   */
  async getJson<T = unknown>(tenantId: string, key: string, defaultValue?: T): Promise<T | null> {
    const raw = await this.get(tenantId, key);
    if (raw === null || raw === undefined) {
      return defaultValue ?? null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new BadRequestException(
        msg(ErrorMessages.SETTING_INVALID_VALUE, key, raw, 'valid JSON'),
      );
    }
  }

  /**
   * Fetch multiple keys in one call.
   */
  async getMany(tenantId: string, keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const key of keys) {
      result[key] = await this.get(tenantId, key);
    }
    return result;
  }

  /**
   * Set tenant-level setting. Invalidates cache.
   */
  async setTenant(
    tenantId: string,
    key: string,
    value: string,
    meta?: { group?: string; type?: string },
  ): Promise<void> {
    await this.tenantSettingsRepo.upsertSetting(tenantId, {
      key,
      value,
      group: meta?.group ?? 'general',
      type: meta?.type ?? 'string',
    });
    this.invalidate(tenantId, key);
  }

  /**
   * Set system-level setting. Invalidates cache.
   */
  async setSystem(
    key: string,
    value: string,
    meta?: { group?: string; type?: string },
  ): Promise<void> {
    await this.systemSettingsRepo.upsertSetting({
      key,
      value,
      group: meta?.group ?? 'general',
      type: meta?.type ?? 'string',
    });
    this.invalidateTenant('*');
  }

  /**
   * Invalidate cache for a specific key.
   */
  invalidate(tenantId: string, key: string): void {
    this.cache.delete(`${tenantId}:${key}`);
  }

  /**
   * Invalidate all cached keys for a tenant (or all if tenantId is '*').
   */
  invalidateTenant(tenantId: string): void {
    if (tenantId === '*') {
      this.cache.clear();
      return;
    }
    const prefix = `${tenantId}:`;
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.startsWith(prefix)) {
        this.cache.delete(cacheKey);
      }
    }
  }
}
