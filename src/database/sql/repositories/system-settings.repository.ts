import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SystemSetting } from '../../../modules/settings/entities/system-setting.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class SystemSettingsRepository extends BaseRepository<SystemSetting> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SystemSetting, false);
  }

  async findAllSettings() {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM system_settings WHERE "deletedAt" IS NULL ORDER BY "group", key`,
    );
    return rows as unknown as any[];
  }

  async findByGroupSettings(group: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM system_settings WHERE "group" = :group AND "deletedAt" IS NULL ORDER BY key`,
      { replacements: { group } },
    );
    return rows as unknown as any[];
  }

  async findByKeySettings(key: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM system_settings WHERE key = :key AND "deletedAt" IS NULL`,
      { replacements: { key } } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async upsertSetting(data: { key: string; value: string | null; group?: string; type?: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    const [rows] = await sequelize.query(
      `INSERT INTO system_settings (id, key, value, "group", type, "createdAt", "updatedAt")
       VALUES (:id, :key, :value, :group, :type, NOW(), NOW())
       ON CONFLICT (key) WHERE "deletedAt" IS NULL DO UPDATE SET value = :value, "updatedAt" = NOW()
       RETURNING *`,
      {
        replacements: {
          id,
          key: data.key,
          value: data.value ?? null,
          group: data.group ?? 'general',
          type: data.type ?? 'string',
        },
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }
}
