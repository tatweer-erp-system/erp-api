import { Injectable, Logger } from '@nestjs/common';
import { AdminNotificationsRepository } from '@/database/sql/repositories/admin-notifications.repository';
import { AdminNotification } from '@/database/sql/entities/admin-notification.entity';

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(private readonly repo: AdminNotificationsRepository) {}

  async findAll(
    adminId: string,
    query: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    return this.repo.findByAdmin(adminId, query);
  }

  async getUnreadCount(adminId: string): Promise<{ count: number }> {
    const count = await this.repo.getUnreadCount(adminId);
    return { count };
  }

  async markAsRead(adminId: string, id: string): Promise<{ success: boolean }> {
    await this.repo.markAsRead(adminId, id);
    return { success: true };
  }

  async markAllAsRead(adminId: string): Promise<{ count: number }> {
    const count = await this.repo.markAllAsRead(adminId);
    return { count };
  }

  async remove(adminId: string, id: string): Promise<{ success: boolean }> {
    await this.repo.softDeleteByAdmin(adminId, id);
    return { success: true };
  }

  /** Create an admin notification (used internally by other services) */
  async create(data: {
    adminId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }): Promise<AdminNotification> {
    return this.repo.create(data as Partial<AdminNotification>);
  }

  /** Notify all admins (broadcast) */
  async notifyAllAdmins(data: {
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
    adminIds: string[];
  }): Promise<void> {
    for (const adminId of data.adminIds) {
      await this.repo.create({
        adminId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data,
      } as Partial<AdminNotification>);
    }
    this.logger.log(
      `Broadcast notification "${data.type}" to ${data.adminIds.length} admins`,
    );
  }
}
