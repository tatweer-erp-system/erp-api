import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string | null;
  bodyAr: string | null;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateNotificationData {
  userId: string;
  type: string;
  titleEn: string;
  titleAr: string;
  bodyEn?: string | null;
  bodyAr?: string | null;
  data?: Record<string, unknown>;
  createdBy?: string | null;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByUserId(
    tenantId: string,
    userId: string,
    options: { page?: number; limit?: number; unread?: boolean; eventType?: string } = {},
  ) {
    const { page = 1, limit = 20, unread, eventType } = options;
    const offset = (page - 1) * limit;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    let whereClause = `"userId" = :userId AND "deletedAt" IS NULL AND "tenantId" = :tenantId`;
    const replacements: Record<string, unknown> = { userId, tenantId, limit, offset };

    if (unread) {
      whereClause += ` AND "isRead" = false`;
    }
    if (eventType) {
      whereClause += ` AND type = :eventType`;
      replacements.eventType = eventType;
    }

    const [rows] = await sequelize.query(
      `SELECT id, "userId" AS "userId", type, "titleEn", "titleAr", "bodyEn", "bodyAr", data, "isRead" AS "isRead",
              "readAt" AS "readAt", "createdBy" AS "createdBy", "createdAt" AS "createdAt",
              "updatedAt" AS "updatedAt"
       FROM notifications WHERE ${whereClause}
       ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset`,
      { replacements },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM notifications WHERE ${whereClause}`,
      { replacements },
    );

    const total = (countResult as unknown as any[])[0]?.total ?? 0;
    return {
      data: rows as unknown as NotificationRecord[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantId: string, id: string): Promise<NotificationRecord | null> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, "userId" AS "userId", type, "titleEn", "titleAr", "bodyEn", "bodyAr", data, "isRead" AS "isRead",
              "readAt" AS "readAt", "createdBy" AS "createdBy", "createdAt" AS "createdAt",
              "updatedAt" AS "updatedAt"
       FROM notifications WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as NotificationRecord[])[0] ?? null;
  }

  async create(tenantId: string, data: CreateNotificationData): Promise<NotificationRecord> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO notifications (id, "tenantId", "userId", type, "titleEn", "titleAr", "bodyEn", "bodyAr", data, "isRead", "createdBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :userId, :type, :titleEn, :titleAr, :bodyEn, :bodyAr, :data, false, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          userId: data.userId,
          type: data.type,
          titleEn: data.titleEn,
          titleAr: data.titleAr,
          bodyEn: data.bodyEn ?? null,
          bodyAr: data.bodyAr ?? null,
          data: JSON.stringify(data.data ?? {}),
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return this.findById(tenantId, id) as Promise<NotificationRecord>;
  }

  async markAsRead(tenantId: string, id: string, userId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE notifications SET "isRead" = true, "readAt" = NOW(), "updatedAt" = NOW()
       WHERE id = :id AND "userId" = :userId AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, userId, tenantId } } as any,
    );
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE notifications SET "isRead" = true, "readAt" = NOW(), "updatedAt" = NOW()
       WHERE "userId" = :userId AND "isRead" = false AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { userId, tenantId } } as any,
    );
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM notifications
       WHERE "userId" = :userId AND "isRead" = false AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { userId, tenantId } },
    );
    return (rows as unknown as any)?.count ?? 0;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE notifications SET "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } } as any,
    );
  }
}
