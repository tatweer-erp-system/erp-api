import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import {
  QUEUE_FCM,
  QUEUE_SMS,
  QUEUE_MAIL,
} from '../../infrastructure/queues/queue.constants';
import { EventsGateway } from '../../infrastructure/websockets/events.gateway';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(QUEUE_FCM) private readonly fcmQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_MAIL) private readonly mailQueue: Queue,
    private readonly eventsGateway: EventsGateway,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  async sendPush(
    tenantSlug: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.fcmQueue.add('send', { tenantSlug, userId, title, body, data }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  async sendSms(phone: string, message: string): Promise<void> {
    await this.smsQueue.add('send', { to: phone, message }, { attempts: 3 });
  }

  async sendEmail(to: string, template: string, context: Record<string, unknown>): Promise<void> {
    await this.mailQueue.add('send', { to, template, context }, { attempts: 3 });
  }

  async sendInApp(
    tenantSlug: string,
    userId: string,
    payload: { type: string; title: string; body?: string; data?: Record<string, unknown> },
  ): Promise<void> {
    try {
      const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
      const id = uuidv4();
      await sequelize.query(
        `INSERT INTO notifications (id, user_id, type, title, body, data, is_read, created_at, updated_at)
         VALUES (:id, :userId, :type, :title, :body, :data, false, NOW(), NOW())`,
        {
          replacements: {
            id,
            userId,
            type: payload.type,
            title: payload.title,
            body: payload.body ?? null,
            data: JSON.stringify(payload.data ?? {}),
          },
        } as any,
      );

      this.eventsGateway.emitToUser(tenantSlug, userId, 'notification:new', {
        id,
        ...payload,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('Failed to send in-app notification', err);
    }
  }

  async findForUser(tenantSlug: string, userId: string, page = 1, limit = 20) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, type, title, body, data, is_read, read_at, created_at
       FROM notifications WHERE user_id = :userId AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { userId, limit, offset: (page - 1) * limit }, type: 'SELECT' } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread
       FROM notifications WHERE user_id = :userId AND deleted_at IS NULL`,
      { replacements: { userId }, type: 'SELECT' } as any,
    );

    const { total, unread } = (countResult as any[])[0] ?? { total: 0, unread: 0 };
    return {
      data: rows,
      meta: { page, limit, total: parseInt(total), unread: parseInt(unread) },
    };
  }

  async markAsRead(tenantSlug: string, userId: string, notificationId: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
       WHERE id = :notificationId AND user_id = :userId`,
      { replacements: { notificationId, userId } } as any,
    );
  }

  async markAllAsRead(tenantSlug: string, userId: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
       WHERE user_id = :userId AND is_read = false`,
      { replacements: { userId } } as any,
    );
  }
}
