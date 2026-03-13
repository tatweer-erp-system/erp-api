import { Injectable, Logger } from '@nestjs/common';
import { SettingsRepository } from '@/database/sql/repositories/settings.repository';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly settingsRepository: SettingsRepository) {}

  async findAll(tenantId: string) {
    if (!tenantId) {
      return this.settingsRepository.findAllRaw({
        order: [
          ['group', 'ASC'],
          ['key', 'ASC'],
        ],
        bypassTenantScope: true,
      });
    }
    return this.settingsRepository.findAllSettings(tenantId);
  }

  async findByGroup(tenantId: string, group: string) {
    if (!tenantId) {
      return this.settingsRepository.findAllRaw({
        where: { group },
        order: [['key', 'ASC']],
        bypassTenantScope: true,
      });
    }
    return this.settingsRepository.findByGroupTenant(tenantId, group);
  }

  async findByKey(tenantId: string, key: string) {
    return this.settingsRepository.findByKeyTenant(tenantId, key);
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    const results: any[] = [];

    for (const item of dto.settings) {
      const setting = await this.settingsRepository.upsertSetting(tenantId, {
        key: item.key,
        value: item.value,
        group: item.group ?? 'general',
        type: item.type ?? 'string',
      });

      if (setting) {
        results.push(setting);
      }
    }

    this.logger.log(`Updated ${results.length} settings`);
    return results;
  }

  async getSettingsMap(tenantId: string): Promise<Record<string, string | null>> {
    const settings = await this.findAll(tenantId);
    const map: Record<string, string | null> = {};
    for (const s of settings as any[]) {
      map[s.key] = s.value;
    }
    return map;
  }
}
