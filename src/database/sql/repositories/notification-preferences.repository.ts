import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  tenantId: string;
  channel: string;
  eventType: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationPreferencesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByUserId(tenantId: string, userId: string): Promise<NotificationPreferenceRecord[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, user_id AS "userId", tenant_id AS "tenantId", channel,
              event_type AS "eventType", enabled, created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notification_preferences
       WHERE user_id = :userId AND tenant_id = :tenantId
       ORDER BY event_type, channel`,
      { replacements: { userId, tenantId } },
    );
    return rows as unknown as NotificationPreferenceRecord[];
  }

  async findByUserAndEvent(
    tenantId: string,
    userId: string,
    eventType: string,
  ): Promise<NotificationPreferenceRecord[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, user_id AS "userId", tenant_id AS "tenantId", channel,
              event_type AS "eventType", enabled, created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notification_preferences
       WHERE user_id = :userId AND tenant_id = :tenantId AND event_type = :eventType`,
      { replacements: { userId, tenantId, eventType } },
    );
    return rows as unknown as NotificationPreferenceRecord[];
  }

  async upsert(
    tenantId: string,
    userId: string,
    eventType: string,
    channel: string,
    enabled: boolean,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO notification_preferences (id, user_id, tenant_id, channel, event_type, enabled, created_at, updated_at)
       VALUES (:id, :userId, :tenantId, :channel, :eventType, :enabled, NOW(), NOW())
       ON CONFLICT (user_id, tenant_id, event_type, channel)
       DO UPDATE SET enabled = :enabled, updated_at = NOW()`,
      {
        replacements: { id, userId, tenantId, channel, eventType, enabled },
      } as any,
    );
  }

  async isChannelEnabled(
    tenantId: string,
    userId: string,
    eventType: string,
    channel: string,
  ): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT enabled FROM notification_preferences
       WHERE user_id = :userId AND tenant_id = :tenantId
         AND event_type = :eventType AND channel = :channel`,
      { replacements: { userId, tenantId, eventType, channel } },
    );
    const record = (rows as unknown as any[])[0];
    // Default to enabled if no preference set
    return record ? record.enabled : true;
  }
}
