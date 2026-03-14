import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TenantSetting } from '../../../modules/settings/entities/tenant-setting.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class TenantSettingsRepository extends BaseRepository<TenantSetting> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(TenantSetting, true);
  }

  async findAllSettings(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM tenant_settings WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL ORDER BY "group", key`,
      { replacements: { tenantId } } as any,
    );
    return rows as unknown as any[];
  }

  async findByGroupTenant(tenantId: string, group: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM tenant_settings WHERE "group" = :group AND "tenantId" = :tenantId AND "deletedAt" IS NULL ORDER BY key`,
      { replacements: { group, tenantId } },
    );
    return rows as unknown as any[];
  }

  async findByKeyTenant(tenantId: string, key: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM tenant_settings WHERE key = :key AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
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
    const id = uuidv7();
    const [rows] = await sequelize.query(
      `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :key, :value, :group, :type, NOW(), NOW())
       ON CONFLICT ("tenantId", key) WHERE "deletedAt" IS NULL DO UPDATE SET value = :value, "updatedAt" = NOW()
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
