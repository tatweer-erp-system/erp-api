import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminNotification } from '@/database/sql/entities/admin-notification.entity';

@Injectable()
export class AdminNotificationsRepository {
  constructor(
    @InjectRepository(AdminNotification)
    private readonly repo: Repository<AdminNotification>,
  ) {}

  async findByAdmin(
    adminId: string,
    query: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.admin_id = :adminId', { adminId })
      .andWhere('n.deleted_at IS NULL');

    if (query.unreadOnly) {
      qb.andWhere('n.is_read = false');
    }

    const [data, total] = await qb
      .orderBy('n.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUnreadCount(adminId: string): Promise<number> {
    return this.repo
      .createQueryBuilder('n')
      .where('n.admin_id = :adminId', { adminId })
      .andWhere('n.is_read = false')
      .andWhere('n.deleted_at IS NULL')
      .getCount();
  }

  async markAsRead(adminId: string, id: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(AdminNotification)
      .set({ isRead: true } as any)
      .where('id = :id AND admin_id = :adminId', { id, adminId })
      .execute();
  }

  async markAllAsRead(adminId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(AdminNotification)
      .set({ isRead: true } as any)
      .where('admin_id = :adminId AND is_read = false', { adminId })
      .execute();
    return result.affected ?? 0;
  }

  async softDeleteByAdmin(adminId: string, id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (entity) {
      await this.repo.softRemove(entity);
    }
  }

  async create(data: Partial<AdminNotification>): Promise<AdminNotification> {
    const entity = this.repo.create(data as AdminNotification);
    return this.repo.save(entity);
  }
}
