import { Injectable, Logger } from '@nestjs/common';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { UpdateTenantSettingsDto } from '../dto/update-tenant-settings.dto';

/** Default settings returned when no overrides exist in the database. */
const DEFAULT_SETTINGS = {
  timezone: 'UTC',
  language: 'en',
  currency: 'SAR',
  dateFormat: 'DD/MM/YYYY',
  sessionTimeout: 30,
  mfaRequired: false,
  maxFailedLoginAttempts: 5,
  accountLockoutDuration: 30,
  emailNotifications: {
    newUser: true,
    loginAlert: true,
    paymentDue: true,
  },
  apiAccessEnabled: true,
};

/**
 * Mapping from flat setting key → { group, type } used when upserting into the
 * key-value settings table.
 */
const SETTING_META: Record<string, { group: string; type: string }> = {
  timezone: { group: 'general', type: 'string' },
  language: { group: 'general', type: 'string' },
  currency: { group: 'general', type: 'string' },
  dateFormat: { group: 'general', type: 'string' },
  sessionTimeout: { group: 'security', type: 'number' },
  mfaRequired: { group: 'security', type: 'boolean' },
  maxFailedLoginAttempts: { group: 'security', type: 'number' },
  accountLockoutDuration: { group: 'security', type: 'number' },
  emailNotifications: { group: 'notifications', type: 'json' },
  apiAccessEnabled: { group: 'api', type: 'boolean' },
};

@Injectable()
export class TenantSettingsService {
  private readonly logger = new Logger(TenantSettingsService.name);

  constructor(
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {}

  /**
   * Get all settings for a tenant, merged with defaults.
   * Returns the flat object shape the frontend expects.
   */
  async getSettings(tenantId: string): Promise<typeof DEFAULT_SETTINGS> {
    const rows = await this.tenantSettingsRepository.findAllSettings(tenantId);

    const map: Record<string, string | null> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    return {
      timezone: (map.timezone as string) ?? DEFAULT_SETTINGS.timezone,
      language: (map.language as string) ?? DEFAULT_SETTINGS.language,
      currency: (map.currency as string) ?? DEFAULT_SETTINGS.currency,
      dateFormat: (map.dateFormat as string) ?? DEFAULT_SETTINGS.dateFormat,
      sessionTimeout:
        map.sessionTimeout != null ? Number(map.sessionTimeout) : DEFAULT_SETTINGS.sessionTimeout,
      mfaRequired:
        map.mfaRequired != null ? map.mfaRequired === 'true' : DEFAULT_SETTINGS.mfaRequired,
      maxFailedLoginAttempts:
        map.maxFailedLoginAttempts != null
          ? Number(map.maxFailedLoginAttempts)
          : DEFAULT_SETTINGS.maxFailedLoginAttempts,
      accountLockoutDuration:
        map.accountLockoutDuration != null
          ? Number(map.accountLockoutDuration)
          : DEFAULT_SETTINGS.accountLockoutDuration,
      emailNotifications:
        map.emailNotifications != null
          ? JSON.parse(map.emailNotifications)
          : { ...DEFAULT_SETTINGS.emailNotifications },
      apiAccessEnabled:
        map.apiAccessEnabled != null
          ? map.apiAccessEnabled === 'true'
          : DEFAULT_SETTINGS.apiAccessEnabled,
    };
  }

  /**
   * Update settings for a tenant.  Converts the flat DTO object into key-value
   * pairs and upserts each one.
   */
  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<typeof DEFAULT_SETTINGS> {
    const entries = this.dtoToKeyValuePairs(dto);

    for (const { key, value } of entries) {
      const meta = SETTING_META[key] ?? { group: 'general', type: 'string' };
      await this.tenantSettingsRepository.upsertSetting(tenantId, {
        key,
        value,
        group: meta.group,
        type: meta.type,
      });
      this.unifiedSettings.invalidate(tenantId, key);
    }

    this.logger.log(`Updated ${entries.length} settings for tenant ${tenantId}`);

    return this.getSettings(tenantId);
  }

  /**
   * Reset all settings for a tenant back to defaults by deleting all rows.
   * The getSettings method will then return defaults.
   */
  async resetSettings(tenantId: string): Promise<typeof DEFAULT_SETTINGS> {
    const sequelize = (
      this.tenantSettingsRepository as any
    ).tenantSequelizeService.getSharedSequelize();
    await sequelize.query(`DELETE FROM tenant_settings WHERE "tenantId" = :tenantId`, {
      replacements: { tenantId },
    });
    this.unifiedSettings.invalidateTenant(tenantId);

    this.logger.log(`Reset settings to defaults for tenant ${tenantId}`);
    return { ...DEFAULT_SETTINGS, emailNotifications: { ...DEFAULT_SETTINGS.emailNotifications } };
  }

  /**
   * Convert the flat DTO into an array of { key, value } pairs suitable for
   * the key-value settings table.
   */
  private dtoToKeyValuePairs(dto: UpdateTenantSettingsDto): { key: string; value: string }[] {
    const pairs: { key: string; value: string }[] = [];

    if (dto.timezone !== undefined) pairs.push({ key: 'timezone', value: dto.timezone });
    if (dto.language !== undefined) pairs.push({ key: 'language', value: dto.language });
    if (dto.currency !== undefined) pairs.push({ key: 'currency', value: dto.currency });
    if (dto.dateFormat !== undefined) pairs.push({ key: 'dateFormat', value: dto.dateFormat });
    if (dto.sessionTimeout !== undefined)
      pairs.push({ key: 'sessionTimeout', value: String(dto.sessionTimeout) });
    if (dto.mfaRequired !== undefined)
      pairs.push({ key: 'mfaRequired', value: String(dto.mfaRequired) });
    if (dto.maxFailedLoginAttempts !== undefined)
      pairs.push({ key: 'maxFailedLoginAttempts', value: String(dto.maxFailedLoginAttempts) });
    if (dto.accountLockoutDuration !== undefined)
      pairs.push({ key: 'accountLockoutDuration', value: String(dto.accountLockoutDuration) });
    if (dto.emailNotifications !== undefined)
      pairs.push({ key: 'emailNotifications', value: JSON.stringify(dto.emailNotifications) });
    if (dto.apiAccessEnabled !== undefined)
      pairs.push({ key: 'apiAccessEnabled', value: String(dto.apiAccessEnabled) });

    return pairs;
  }
}
