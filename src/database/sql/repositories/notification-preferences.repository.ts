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
      `SELECT id, "userId" AS "userId", "tenantId" AS "tenantId", channel,
              "eventType" AS "eventType", enabled, "createdAt" AS "createdAt",
              "updatedAt" AS "updatedAt"
       FROM notification_preferences
       WHERE "userId" = :userId AND "tenantId" = :tenantId
       ORDER BY "eventType", channel`,
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
      `SELECT id, "userId" AS "userId", "tenantId" AS "tenantId", channel,
              "eventType" AS "eventType", enabled, "createdAt" AS "createdAt",
              "updatedAt" AS "updatedAt"
       FROM notification_preferences
       WHERE "userId" = :userId AND "tenantId" = :tenantId AND "eventType" = :eventType`,
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
      `INSERT INTO notification_preferences (id, "userId", "tenantId", channel, "eventType", enabled, "createdAt", "updatedAt")
       VALUES (:id, :userId, :tenantId, :channel, :eventType, :enabled, NOW(), NOW())
       ON CONFLICT ("userId", "tenantId", "eventType", channel)
       DO UPDATE SET enabled = :enabled, "updatedAt" = NOW()`,
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
       WHERE "userId" = :userId AND "tenantId" = :tenantId
         AND "eventType" = :eventType AND channel = :channel`,
      { replacements: { userId, tenantId, eventType, channel } },
    );
    const record = (rows as unknown as any[])[0];
    // Default to enabled if no preference set
    return record ? record.enabled : true;
  }
}
