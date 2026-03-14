import { Injectable, Logger } from '@nestjs/common';
import { SystemSettingsRepository } from '@/database/sql/repositories/system-settings.repository';
import { UnifiedSettingsService } from './unified-settings.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    private readonly systemSettingsRepository: SystemSettingsRepository,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {}

  async findAll(group?: string) {
    if (group) {
      return this.systemSettingsRepository.findByGroupSettings(group);
    }
    return this.systemSettingsRepository.findAllSettings();
  }

  async findByKey(key: string) {
    return this.systemSettingsRepository.findByKeySettings(key);
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const results: any[] = [];

    for (const item of dto.settings) {
      const setting = await this.systemSettingsRepository.upsertSetting({
        key: item.key,
        value: item.value,
        group: item.group ?? 'general',
        type: item.type ?? 'string',
      });

      if (setting) {
        results.push(setting);
      }
    }

    // Invalidate all cached settings since system-level changes affect all tenants
    this.unifiedSettings.invalidateTenant('*');

    this.logger.log(`Updated ${results.length} system settings`);
    return results;
  }

  async getSettingsMap(): Promise<Record<string, string | null>> {
    const settings = await this.findAll();
    const map: Record<string, string | null> = {};
    for (const s of settings as any[]) {
      map[s.key] = s.value;
    }
    return map;
  }
}
