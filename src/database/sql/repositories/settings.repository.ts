import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Setting } from '../../../modules/settings/entities/setting.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SettingsRepository extends BaseRepository<Setting> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Setting, true);
  }

  async findByKey(key: string, tenantId: string): Promise<Setting | null> {
    return this.findOne({ where: { key }, tenantId });
  }

  async findByGroup(group: string, tenantId: string): Promise<Setting[]> {
    return this.findAllRaw({ where: { group }, order: [['key', 'ASC']], tenantId });
  }

  // ── Raw SQL tenant-aware methods ─────────────────────────────────────────────

  async findAllSettings(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM settings WHERE tenant_id = :tenantId ORDER BY "group", key`,
      { replacements: { tenantId } } as any,
    );
    return rows as unknown as any[];
  }

  async findByGroupTenant(tenantId: string, group: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM settings WHERE "group" = :group AND tenant_id = :tenantId ORDER BY key`,
      { replacements: { group, tenantId } },
    );
    return rows as unknown as any[];
  }

  async findByKeyTenant(tenantId: string, key: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM settings WHERE key = :key AND tenant_id = :tenantId`,
      { replacements: { key, tenantId } } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async upsertSetting(
    tenantId: string,
    data: {
      key: string;
      value: string | null;
      group?: string;
      type?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    const [rows] = await sequelize.query(
      `INSERT INTO settings (id, tenant_id, key, value, "group", type, created_at, updated_at)
       VALUES (:id, :tenantId, :key, :value, :group, :type, NOW(), NOW())
       ON CONFLICT (key, tenant_id) DO UPDATE SET value = :value, updated_at = NOW()
       RETURNING *`,
      {
        replacements: {
          id,
          tenantId,
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
