import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_FCM, QUEUE_SMS, QUEUE_MAIL } from '@/infrastructure/queues/queue.constants';
import { EventsGateway } from '@/infrastructure/websockets/events.gateway';
import { NotificationsRepository } from '@/database/sql/repositories/notifications.repository';
import { NotificationPreferencesRepository } from '@/database/sql/repositories/notification-preferences.repository';
import { NotificationTemplatesRepository } from '@/database/sql/repositories/notification-templates.repository';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(QUEUE_FCM) private readonly fcmQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_MAIL) private readonly mailQueue: Queue,
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly preferencesRepository: NotificationPreferencesRepository,
    private readonly templatesRepository: NotificationTemplatesRepository,
  ) {}

  // ── Notification CRUD ────────────────────────────────────────────────────

  async findAll(tenantId: string, userId: string, query: QueryNotificationsDto) {
    return this.notificationsRepository.findByUserId(tenantId, userId, {
      page: query.page,
      limit: query.limit,
      unread: query.unread,
      eventType: query.eventType,
    });
  }

  async findById(tenantId: string, id: string) {
    const notification = await this.notificationsRepository.findById(tenantId, id);
    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }
    return notification;
  }

  async send(tenantId: string, dto: SendNotificationDto) {
    const channels = dto.channels ?? ['push', 'email', 'in_app'];
    const delay = dto.sendAt ? new Date(dto.sendAt).getTime() - Date.now() : undefined;
    const jobOptions: Record<string, unknown> = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    };
    if (delay && delay > 0) {
      jobOptions.delay = delay;
    }

    for (const channel of channels) {
      // Check user preferences before dispatching
      const enabled = await this.preferencesRepository.isChannelEnabled(
        tenantId,
        dto.userId,
        dto.eventType,
        channel,
      );
      if (!enabled) {
        this.logger.debug(
          `Channel "${channel}" disabled for user ${dto.userId} event ${dto.eventType}, skipping`,
        );
        continue;
      }

      switch (channel) {
        case 'push':
          await this.fcmQueue.add(
            'send',
            {
              tenantId,
              userId: dto.userId,
              title: dto.title_en,
              body: dto.body_en,
              data: dto.data
                ? Object.fromEntries(Object.entries(dto.data).map(([k, v]) => [k, String(v)]))
                : {},
            },
            jobOptions as any,
          );
          break;

        case 'sms':
          await this.smsQueue.add(
            'send',
            {
              tenantId,
              userId: dto.userId,
              message: dto.body_en,
            },
            jobOptions as any,
          );
          break;

        case 'email':
          await this.mailQueue.add(
            'send',
            {
              tenantId,
              userId: dto.userId,
              subject: dto.title_en,
              template: dto.eventType,
              context: {
                title_en: dto.title_en,
                title_ar: dto.title_ar,
                body_en: dto.body_en,
                body_ar: dto.body_ar,
                ...dto.data,
              },
            },
            jobOptions as any,
          );
          break;

        case 'in_app':
          await this.sendInApp(tenantId, dto);
          break;
      }
    }

    return { message: 'Notification dispatched successfully' };
  }

  private async sendInApp(tenantId: string, dto: SendNotificationDto) {
    try {
      const notification = await this.notificationsRepository.create(tenantId, {
        userId: dto.userId,
        type: dto.eventType,
        title: dto.title_en,
        body: dto.body_en,
        data: {
          title_ar: dto.title_ar,
          body_ar: dto.body_ar,
          ...dto.data,
        },
      });

      this.eventsGateway.emitToUser(tenantId, dto.userId, 'notification:new', notification);
    } catch (err) {
      this.logger.error('Failed to send in-app notification', err);
    }
  }

  async markAsRead(tenantId: string, userId: string, id: string) {
    await this.notificationsRepository.markAsRead(tenantId, id, userId);
    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(tenantId: string, userId: string) {
    await this.notificationsRepository.markAllAsRead(tenantId, userId);
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const count = await this.notificationsRepository.getUnreadCount(tenantId, userId);
    return { count };
  }

  async remove(tenantId: string, id: string) {
    await this.notificationsRepository.softDelete(tenantId, id);
    return { message: 'Notification deleted' };
  }

  // ── Legacy methods (kept for backward compatibility with shared module) ──

  async sendPush(
    tenantId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.fcmQueue.add(
      'send',
      { tenantId, userId, title, body, data },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  async sendSms(phone: string, message: string): Promise<void> {
    await this.smsQueue.add('send', { to: phone, message }, { attempts: 3 });
  }

  async sendEmail(to: string, template: string, context: Record<string, unknown>): Promise<void> {
    await this.mailQueue.add('send', { to, template, context }, { attempts: 3 });
  }

  async sendInAppLegacy(
    tenantId: string,
    userId: string,
    payload: { type: string; title: string; body?: string; data?: Record<string, unknown> },
  ): Promise<void> {
    try {
      const notification = await this.notificationsRepository.create(tenantId, {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        data: payload.data,
      });

      this.eventsGateway.emitToUser(tenantId, userId, 'notification:new', notification);
    } catch (err) {
      this.logger.error('Failed to send in-app notification', err);
    }
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  async getPreferences(tenantId: string, userId: string) {
    return this.preferencesRepository.findByUserId(tenantId, userId);
  }

  async updatePreferences(tenantId: string, userId: string, dto: UpdatePreferencesDto) {
    for (const pref of dto.preferences) {
      await this.preferencesRepository.upsert(
        tenantId,
        userId,
        pref.eventType,
        pref.channel,
        pref.enabled,
      );
    }
    return this.preferencesRepository.findByUserId(tenantId, userId);
  }

  // ── Templates ────────────────────────────────────────────────────────────

  async getTemplates(tenantId: string, query: PaginationDto) {
    return this.templatesRepository.findAll(tenantId, {
      page: query.page,
      limit: query.limit,
    });
  }

  async getTemplateById(tenantId: string, id: string) {
    const template = await this.templatesRepository.findById(tenantId, id);
    if (!template) {
      throw new NotFoundException(`Template with id ${id} not found`);
    }
    return template;
  }

  async createTemplate(tenantId: string, dto: CreateTemplateDto) {
    return this.templatesRepository.create(tenantId, {
      eventType: dto.eventType,
      channel: dto.channel,
      subjectEn: dto.subject_en ?? null,
      subjectAr: dto.subject_ar ?? null,
      bodyEn: dto.body_en,
      bodyAr: dto.body_ar,
    });
  }

  async updateTemplate(tenantId: string, id: string, dto: UpdateTemplateDto) {
    await this.getTemplateById(tenantId, id);
    return this.templatesRepository.update(tenantId, id, {
      eventType: dto.eventType,
      channel: dto.channel,
      subjectEn: dto.subject_en,
      subjectAr: dto.subject_ar,
      bodyEn: dto.body_en,
      bodyAr: dto.body_ar,
    });
  }

  async removeTemplate(tenantId: string, id: string) {
    await this.getTemplateById(tenantId, id);
    await this.templatesRepository.delete(tenantId, id);
    return { message: 'Template deleted' };
  }
}
