import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

export interface NotificationTemplateRecord {
  id: string;
  tenantId: string;
  eventType: string;
  channel: string;
  subjectEn: string | null;
  subjectAr: string | null;
  bodyEn: string;
  bodyAr: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationTemplatesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT id, "tenantId" AS "tenantId", "eventType" AS "eventType", channel,
              "subjectEn" AS "subjectEn", "subjectAr" AS "subjectAr",
              "bodyEn" AS "bodyEn", "bodyAr" AS "bodyAr",
              "isDefault" AS "isDefault", "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"
       FROM notification_templates
       WHERE "tenantId" = :tenantId OR "isDefault" = true
       ORDER BY "eventType", channel
       LIMIT :limit OFFSET :offset`,
      { replacements: { tenantId, limit, offset } },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM notification_templates
       WHERE "tenantId" = :tenantId OR "isDefault" = true`,
      { replacements: { tenantId } },
    );

    const total = (countResult as unknown as any[])[0]?.total ?? 0;
    return {
      data: rows as unknown as NotificationTemplateRecord[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string): Promise<NotificationTemplateRecord | null> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, "tenantId" AS "tenantId", "eventType" AS "eventType", channel,
              "subjectEn" AS "subjectEn", "subjectAr" AS "subjectAr",
              "bodyEn" AS "bodyEn", "bodyAr" AS "bodyAr",
              "isDefault" AS "isDefault", "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"
       FROM notification_templates WHERE id = :id AND ("tenantId" = :tenantId OR "isDefault" = true)`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as NotificationTemplateRecord[])[0] ?? null;
  }

  async findByEventAndChannel(
    tenantId: string,
    eventType: string,
    channel: string,
  ): Promise<NotificationTemplateRecord | null> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    // Prefer tenant-specific template over default
    const [rows] = await sequelize.query(
      `SELECT id, "tenantId" AS "tenantId", "eventType" AS "eventType", channel,
              "subjectEn" AS "subjectEn", "subjectAr" AS "subjectAr",
              "bodyEn" AS "bodyEn", "bodyAr" AS "bodyAr",
              "isDefault" AS "isDefault", "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"
       FROM notification_templates
       WHERE "eventType" = :eventType AND channel = :channel
         AND ("tenantId" = :tenantId OR "isDefault" = true)
       ORDER BY "isDefault" ASC
       LIMIT 1`,
      { replacements: { tenantId, eventType, channel } },
    );
    return (rows as unknown as NotificationTemplateRecord[])[0] ?? null;
  }

  async findDefaults(tenantId: string): Promise<NotificationTemplateRecord[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, "tenantId" AS "tenantId", "eventType" AS "eventType", channel,
              "subjectEn" AS "subjectEn", "subjectAr" AS "subjectAr",
              "bodyEn" AS "bodyEn", "bodyAr" AS "bodyAr",
              "isDefault" AS "isDefault", "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"
       FROM notification_templates WHERE "isDefault" = true
       ORDER BY "eventType", channel`,
      {},
    );
    return rows as unknown as NotificationTemplateRecord[];
  }

  async findTenantOverrides(tenantId: string): Promise<NotificationTemplateRecord[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, "tenantId" AS "tenantId", "eventType" AS "eventType", channel,
              "subjectEn" AS "subjectEn", "subjectAr" AS "subjectAr",
              "bodyEn" AS "bodyEn", "bodyAr" AS "bodyAr",
              "isDefault" AS "isDefault", "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"
       FROM notification_templates
       WHERE "tenantId" = :tenantId AND "isDefault" = false
       ORDER BY "eventType", channel`,
      { replacements: { tenantId } },
    );
    return rows as unknown as NotificationTemplateRecord[];
  }

  async create(
    tenantId: string,
    data: {
      eventType: string;
      channel: string;
      subjectEn?: string | null;
      subjectAr?: string | null;
      bodyEn: string;
      bodyAr: string;
      isDefault?: boolean;
    },
  ): Promise<NotificationTemplateRecord> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO notification_templates
        (id, "tenantId", "eventType", channel, "subjectEn", "subjectAr", "bodyEn", "bodyAr", "isDefault", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :eventType, :channel, :subjectEn, :subjectAr, :bodyEn, :bodyAr, :isDefault, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          eventType: data.eventType,
          channel: data.channel,
          subjectEn: data.subjectEn ?? null,
          subjectAr: data.subjectAr ?? null,
          bodyEn: data.bodyEn,
          bodyAr: data.bodyAr,
          isDefault: data.isDefault ?? false,
        },
      } as any,
    );
    return this.findById(tenantId, id) as Promise<NotificationTemplateRecord>;
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      eventType: string;
      channel: string;
      subjectEn: string | null;
      subjectAr: string | null;
      bodyEn: string;
      bodyAr: string;
    }>,
  ): Promise<NotificationTemplateRecord | null> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const setClauses: string[] = ['"updatedAt" = NOW()'];
    const replacements: Record<string, unknown> = { id, tenantId };

    if (data.eventType !== undefined) {
      setClauses.push('"eventType" = :eventType');
      replacements.eventType = data.eventType;
    }
    if (data.channel !== undefined) {
      setClauses.push('channel = :channel');
      replacements.channel = data.channel;
    }
    if (data.subjectEn !== undefined) {
      setClauses.push('"subjectEn" = :subjectEn');
      replacements.subjectEn = data.subjectEn;
    }
    if (data.subjectAr !== undefined) {
      setClauses.push('"subjectAr" = :subjectAr');
      replacements.subjectAr = data.subjectAr;
    }
    if (data.bodyEn !== undefined) {
      setClauses.push('"bodyEn" = :bodyEn');
      replacements.bodyEn = data.bodyEn;
    }
    if (data.bodyAr !== undefined) {
      setClauses.push('"bodyAr" = :bodyAr');
      replacements.bodyAr = data.bodyAr;
    }

    await sequelize.query(
      `UPDATE notification_templates SET ${setClauses.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements } as any,
    );

    return this.findById(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `DELETE FROM notification_templates WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { id, tenantId },
      } as any,
    );
  }
}
