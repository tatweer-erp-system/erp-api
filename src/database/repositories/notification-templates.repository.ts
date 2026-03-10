import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationTemplateRecord {
  id: string;
  tenantSlug: string;
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

  async findAll(tenantSlug: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [rows] = await sequelize.query(
      `SELECT id, tenant_slug AS "tenantSlug", event_type AS "eventType", channel,
              subject_en AS "subjectEn", subject_ar AS "subjectAr",
              body_en AS "bodyEn", body_ar AS "bodyAr",
              is_default AS "isDefault", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM notification_templates
       WHERE tenant_slug = :tenantSlug OR is_default = true
       ORDER BY event_type, channel
       LIMIT :limit OFFSET :offset`,
      { replacements: { tenantSlug, limit, offset }, type: 'SELECT' } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM notification_templates
       WHERE tenant_slug = :tenantSlug OR is_default = true`,
      { replacements: { tenantSlug }, type: 'SELECT' } as any,
    );

    const total = (countResult as any)?.total ?? 0;
    return {
      data: rows as NotificationTemplateRecord[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantSlug: string, id: string): Promise<NotificationTemplateRecord | null> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, tenant_slug AS "tenantSlug", event_type AS "eventType", channel,
              subject_en AS "subjectEn", subject_ar AS "subjectAr",
              body_en AS "bodyEn", body_ar AS "bodyAr",
              is_default AS "isDefault", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM notification_templates WHERE id = :id`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    return (rows as NotificationTemplateRecord[])[0] ?? null;
  }

  async findByEventAndChannel(
    tenantSlug: string,
    eventType: string,
    channel: string,
  ): Promise<NotificationTemplateRecord | null> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    // Prefer tenant-specific template over default
    const [rows] = await sequelize.query(
      `SELECT id, tenant_slug AS "tenantSlug", event_type AS "eventType", channel,
              subject_en AS "subjectEn", subject_ar AS "subjectAr",
              body_en AS "bodyEn", body_ar AS "bodyAr",
              is_default AS "isDefault", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM notification_templates
       WHERE event_type = :eventType AND channel = :channel
         AND (tenant_slug = :tenantSlug OR is_default = true)
       ORDER BY is_default ASC
       LIMIT 1`,
      { replacements: { tenantSlug, eventType, channel }, type: 'SELECT' } as any,
    );
    return (rows as NotificationTemplateRecord[])[0] ?? null;
  }

  async findDefaults(tenantSlug: string): Promise<NotificationTemplateRecord[]> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, tenant_slug AS "tenantSlug", event_type AS "eventType", channel,
              subject_en AS "subjectEn", subject_ar AS "subjectAr",
              body_en AS "bodyEn", body_ar AS "bodyAr",
              is_default AS "isDefault", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM notification_templates WHERE is_default = true
       ORDER BY event_type, channel`,
      { type: 'SELECT' } as any,
    );
    return rows as NotificationTemplateRecord[];
  }

  async findTenantOverrides(tenantSlug: string): Promise<NotificationTemplateRecord[]> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, tenant_slug AS "tenantSlug", event_type AS "eventType", channel,
              subject_en AS "subjectEn", subject_ar AS "subjectAr",
              body_en AS "bodyEn", body_ar AS "bodyAr",
              is_default AS "isDefault", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM notification_templates
       WHERE tenant_slug = :tenantSlug AND is_default = false
       ORDER BY event_type, channel`,
      { replacements: { tenantSlug }, type: 'SELECT' } as any,
    );
    return rows as NotificationTemplateRecord[];
  }

  async create(
    tenantSlug: string,
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
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO notification_templates
        (id, tenant_slug, event_type, channel, subject_en, subject_ar, body_en, body_ar, is_default, created_at, updated_at)
       VALUES (:id, :tenantSlug, :eventType, :channel, :subjectEn, :subjectAr, :bodyEn, :bodyAr, :isDefault, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantSlug,
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
    return this.findById(tenantSlug, id) as Promise<NotificationTemplateRecord>;
  }

  async update(
    tenantSlug: string,
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
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const setClauses: string[] = ['updated_at = NOW()'];
    const replacements: Record<string, unknown> = { id };

    if (data.eventType !== undefined) {
      setClauses.push('event_type = :eventType');
      replacements.eventType = data.eventType;
    }
    if (data.channel !== undefined) {
      setClauses.push('channel = :channel');
      replacements.channel = data.channel;
    }
    if (data.subjectEn !== undefined) {
      setClauses.push('subject_en = :subjectEn');
      replacements.subjectEn = data.subjectEn;
    }
    if (data.subjectAr !== undefined) {
      setClauses.push('subject_ar = :subjectAr');
      replacements.subjectAr = data.subjectAr;
    }
    if (data.bodyEn !== undefined) {
      setClauses.push('body_en = :bodyEn');
      replacements.bodyEn = data.bodyEn;
    }
    if (data.bodyAr !== undefined) {
      setClauses.push('body_ar = :bodyAr');
      replacements.bodyAr = data.bodyAr;
    }

    await sequelize.query(
      `UPDATE notification_templates SET ${setClauses.join(', ')} WHERE id = :id`,
      { replacements } as any,
    );

    return this.findById(tenantSlug, id);
  }

  async delete(tenantSlug: string, id: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`DELETE FROM notification_templates WHERE id = :id`, {
      replacements: { id },
    } as any);
  }
}
