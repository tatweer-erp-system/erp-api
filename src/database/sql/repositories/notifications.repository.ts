import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
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
  title: string;
  body?: string | null;
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

    let whereClause = `user_id = :userId AND deleted_at IS NULL AND tenant_id = :tenantId`;
    const replacements: Record<string, unknown> = { userId, tenantId, limit, offset };

    if (unread) {
      whereClause += ` AND is_read = false`;
    }
    if (eventType) {
      whereClause += ` AND type = :eventType`;
      replacements.eventType = eventType;
    }

    const [rows] = await sequelize.query(
      `SELECT id, user_id AS "userId", type, title, body, data, is_read AS "isRead",
              read_at AS "readAt", created_by AS "createdBy", created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notifications WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
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
      `SELECT id, user_id AS "userId", type, title, body, data, is_read AS "isRead",
              read_at AS "readAt", created_by AS "createdBy", created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notifications WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as NotificationRecord[])[0] ?? null;
  }

  async create(tenantId: string, data: CreateNotificationData): Promise<NotificationRecord> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO notifications (id, tenant_id, user_id, type, title, body, data, is_read, created_by, created_at, updated_at)
       VALUES (:id, :tenantId, :userId, :type, :title, :body, :data, false, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          body: data.body ?? null,
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
      `UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
       WHERE id = :id AND user_id = :userId AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, userId, tenantId } } as any,
    );
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
       WHERE user_id = :userId AND is_read = false AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { userId, tenantId } } as any,
    );
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM notifications
       WHERE user_id = :userId AND is_read = false AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { userId, tenantId } },
    );
    return (rows as unknown as any)?.count ?? 0;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE notifications SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } } as any,
    );
  }
}
