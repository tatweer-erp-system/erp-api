import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  tenantSlug: string;
  channel: string;
  eventType: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationPreferencesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByUserId(tenantSlug: string, userId: string): Promise<NotificationPreferenceRecord[]> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, user_id AS "userId", tenant_slug AS "tenantSlug", channel,
              event_type AS "eventType", enabled, created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notification_preferences
       WHERE user_id = :userId AND tenant_slug = :tenantSlug
       ORDER BY event_type, channel`,
      { replacements: { userId, tenantSlug }, type: 'SELECT' } as any,
    );
    return rows as NotificationPreferenceRecord[];
  }

  async findByUserAndEvent(
    tenantSlug: string,
    userId: string,
    eventType: string,
  ): Promise<NotificationPreferenceRecord[]> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, user_id AS "userId", tenant_slug AS "tenantSlug", channel,
              event_type AS "eventType", enabled, created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notification_preferences
       WHERE user_id = :userId AND tenant_slug = :tenantSlug AND event_type = :eventType`,
      { replacements: { userId, tenantSlug, eventType }, type: 'SELECT' } as any,
    );
    return rows as NotificationPreferenceRecord[];
  }

  async upsert(
    tenantSlug: string,
    userId: string,
    eventType: string,
    channel: string,
    enabled: boolean,
  ): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO notification_preferences (id, user_id, tenant_slug, channel, event_type, enabled, created_at, updated_at)
       VALUES (:id, :userId, :tenantSlug, :channel, :eventType, :enabled, NOW(), NOW())
       ON CONFLICT (user_id, tenant_slug, event_type, channel)
       DO UPDATE SET enabled = :enabled, updated_at = NOW()`,
      {
        replacements: { id, userId, tenantSlug, channel, eventType, enabled },
      } as any,
    );
  }

  async isChannelEnabled(
    tenantSlug: string,
    userId: string,
    eventType: string,
    channel: string,
  ): Promise<boolean> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT enabled FROM notification_preferences
       WHERE user_id = :userId AND tenant_slug = :tenantSlug
         AND event_type = :eventType AND channel = :channel`,
      { replacements: { userId, tenantSlug, eventType, channel }, type: 'SELECT' } as any,
    );
    const record = (rows as any[])[0];
    // Default to enabled if no preference set
    return record ? record.enabled : true;
  }
}
