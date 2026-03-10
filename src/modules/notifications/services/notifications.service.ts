import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_FCM, QUEUE_SMS, QUEUE_MAIL } from '@/infrastructure/queues/queue.constants';
import { EventsGateway } from '@/infrastructure/websockets/events.gateway';
import { NotificationsRepository } from '@/database/repositories/notifications.repository';
import { NotificationPreferencesRepository } from '@/database/repositories/notification-preferences.repository';
import { NotificationTemplatesRepository } from '@/database/repositories/notification-templates.repository';
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

  async findAll(tenantSlug: string, userId: string, query: QueryNotificationsDto) {
    return this.notificationsRepository.findByUserId(tenantSlug, userId, {
      page: query.page,
      limit: query.limit,
      unread: query.unread,
      eventType: query.eventType,
    });
  }

  async findById(tenantSlug: string, id: string) {
    const notification = await this.notificationsRepository.findById(tenantSlug, id);
    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }
    return notification;
  }

  async send(tenantSlug: string, dto: SendNotificationDto) {
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
        tenantSlug,
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
              tenantSlug,
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
              tenantSlug,
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
              tenantSlug,
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
          await this.sendInApp(tenantSlug, dto);
          break;
      }
    }

    return { message: 'Notification dispatched successfully' };
  }

  private async sendInApp(tenantSlug: string, dto: SendNotificationDto) {
    try {
      const notification = await this.notificationsRepository.create(tenantSlug, {
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

      this.eventsGateway.emitToUser(tenantSlug, dto.userId, 'notification:new', notification);
    } catch (err) {
      this.logger.error('Failed to send in-app notification', err);
    }
  }

  async markAsRead(tenantSlug: string, userId: string, id: string) {
    await this.notificationsRepository.markAsRead(tenantSlug, id, userId);
    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(tenantSlug: string, userId: string) {
    await this.notificationsRepository.markAllAsRead(tenantSlug, userId);
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(tenantSlug: string, userId: string) {
    const count = await this.notificationsRepository.getUnreadCount(tenantSlug, userId);
    return { count };
  }

  async remove(tenantSlug: string, id: string) {
    await this.notificationsRepository.softDelete(tenantSlug, id);
    return { message: 'Notification deleted' };
  }

  // ── Legacy methods (kept for backward compatibility with shared module) ──

  async sendPush(
    tenantSlug: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.fcmQueue.add(
      'send',
      { tenantSlug, userId, title, body, data },
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
    tenantSlug: string,
    userId: string,
    payload: { type: string; title: string; body?: string; data?: Record<string, unknown> },
  ): Promise<void> {
    try {
      const notification = await this.notificationsRepository.create(tenantSlug, {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        data: payload.data,
      });

      this.eventsGateway.emitToUser(tenantSlug, userId, 'notification:new', notification);
    } catch (err) {
      this.logger.error('Failed to send in-app notification', err);
    }
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  async getPreferences(tenantSlug: string, userId: string) {
    return this.preferencesRepository.findByUserId(tenantSlug, userId);
  }

  async updatePreferences(tenantSlug: string, userId: string, dto: UpdatePreferencesDto) {
    for (const pref of dto.preferences) {
      await this.preferencesRepository.upsert(
        tenantSlug,
        userId,
        pref.eventType,
        pref.channel,
        pref.enabled,
      );
    }
    return this.preferencesRepository.findByUserId(tenantSlug, userId);
  }

  // ── Templates ────────────────────────────────────────────────────────────

  async getTemplates(tenantSlug: string, query: PaginationDto) {
    return this.templatesRepository.findAll(tenantSlug, {
      page: query.page,
      limit: query.limit,
    });
  }

  async getTemplateById(tenantSlug: string, id: string) {
    const template = await this.templatesRepository.findById(tenantSlug, id);
    if (!template) {
      throw new NotFoundException(`Template with id ${id} not found`);
    }
    return template;
  }

  async createTemplate(tenantSlug: string, dto: CreateTemplateDto) {
    return this.templatesRepository.create(tenantSlug, {
      eventType: dto.eventType,
      channel: dto.channel,
      subjectEn: dto.subject_en ?? null,
      subjectAr: dto.subject_ar ?? null,
      bodyEn: dto.body_en,
      bodyAr: dto.body_ar,
    });
  }

  async updateTemplate(tenantSlug: string, id: string, dto: UpdateTemplateDto) {
    await this.getTemplateById(tenantSlug, id);
    return this.templatesRepository.update(tenantSlug, id, {
      eventType: dto.eventType,
      channel: dto.channel,
      subjectEn: dto.subject_en,
      subjectAr: dto.subject_ar,
      bodyEn: dto.body_en,
      bodyAr: dto.body_ar,
    });
  }

  async removeTemplate(tenantSlug: string, id: string) {
    await this.getTemplateById(tenantSlug, id);
    await this.templatesRepository.delete(tenantSlug, id);
    return { message: 'Template deleted' };
  }
}
