import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { AdminNotification } from '../entities/admin-notification.entity';

@Injectable()
export class AdminNotificationsRepository extends BaseRepository<AdminNotification> {
  constructor() {
    super(AdminNotification);
  }

  async findByAdmin(
    adminId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean },
  ): Promise<{
    data: AdminNotification[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { adminId };
    if (options.unreadOnly) where.isRead = false;

    const { rows, count } = await AdminNotification.findAndCountAll({
      where: where as any,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      paranoid: true,
    });

    return {
      data: rows.map((r) => r.get({ plain: true }) as AdminNotification),
      meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  }

  async getUnreadCount(adminId: string): Promise<number> {
    return AdminNotification.count({
      where: { adminId, isRead: false } as any,
      paranoid: true,
    });
  }

  async markAsRead(adminId: string, id: string): Promise<void> {
    await AdminNotification.update(
      { isRead: true, readAt: new Date() } as any,
      { where: { id, adminId } as any },
    );
  }

  async markAllAsRead(adminId: string): Promise<number> {
    const [count] = await AdminNotification.update(
      { isRead: true, readAt: new Date() } as any,
      { where: { adminId, isRead: false } as any },
    );
    return count;
  }

  async softDeleteByAdmin(adminId: string, id: string): Promise<void> {
    await AdminNotification.update(
      { deletedAt: new Date() } as any,
      { where: { id, adminId } as any },
    );
  }
}
