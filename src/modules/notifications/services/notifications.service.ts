import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_FCM, QUEUE_SMS, QUEUE_MAIL } from '@/infrastructure/queues/queue.constants';
import { EventsGateway } from '@/infrastructure/websockets/events.gateway';
import { NotificationsRepository } from '@/database/sql/repositories/notifications.repository';
import { NotificationPreferencesRepository } from '@/database/sql/repositories/notification-preferences.repository';
import { NotificationTemplatesRepository } from '@/database/sql/repositories/notification-templates.repository';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { RegisterFcmTokenDto } from '../dto/register-fcm-token.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { v7 as uuidv7 } from 'uuid';
import { NotificationChannel } from '@/common/enums/notification.enums';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '../constants/default-templates';

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
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly outboxSharedService: OutboxSharedService,
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
              title: dto.titleEn,
              body: dto.bodyEn,
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
              message: dto.bodyEn,
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
              subject: dto.titleEn,
              template: dto.eventType,
              context: {
                titleEn: dto.titleEn,
                titleAr: dto.titleAr,
                bodyEn: dto.bodyEn,
                bodyAr: dto.bodyAr,
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
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        bodyEn: dto.bodyEn,
        bodyAr: dto.bodyAr,
        data: dto.data,
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
    payload: {
      type: string;
      titleEn: string;
      titleAr: string;
      bodyEn?: string;
      bodyAr?: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      const notification = await this.notificationsRepository.create(tenantId, {
        userId,
        type: payload.type,
        titleEn: payload.titleEn,
        titleAr: payload.titleAr,
        bodyEn: payload.bodyEn ?? null,
        bodyAr: payload.bodyAr ?? null,
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
      subjectEn: dto.subjectEn ?? null,
      subjectAr: dto.subjectAr ?? null,
      bodyEn: dto.bodyEn,
      bodyAr: dto.bodyAr,
    });
  }

  async updateTemplate(tenantId: string, id: string, dto: UpdateTemplateDto) {
    await this.getTemplateById(tenantId, id);
    return this.templatesRepository.update(tenantId, id, {
      eventType: dto.eventType,
      channel: dto.channel,
      subjectEn: dto.subjectEn,
      subjectAr: dto.subjectAr,
      bodyEn: dto.bodyEn,
      bodyAr: dto.bodyAr,
    });
  }

  async removeTemplate(tenantId: string, id: string) {
    await this.getTemplateById(tenantId, id);
    await this.templatesRepository.delete(tenantId, id);
    return { message: 'Template deleted' };
  }

  async seedDefaultTemplates(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Get tenant slug
    const [tenantRows] = await sequelize.query(
      `SELECT slug FROM tenants WHERE id = :tenantId LIMIT 1`,
      { replacements: { tenantId } },
    );
    const tenant = (tenantRows as { slug: string }[])[0];
    const tenantSlug = tenant?.slug ?? '';

    let seeded = 0;

    for (const tmpl of DEFAULT_NOTIFICATION_TEMPLATES) {
      // Check if template already exists for this tenant + eventType + channel
      const existing = await this.templatesRepository.findByEventAndChannel(
        tenantId,
        tmpl.eventType,
        tmpl.channel,
      );

      if (!existing) {
        await this.templatesRepository.create(tenantId, {
          eventType: tmpl.eventType,
          channel: tmpl.channel,
          subjectEn: tmpl.subjectEn,
          subjectAr: tmpl.subjectAr,
          bodyEn: tmpl.bodyEn,
          bodyAr: tmpl.bodyAr,
          isDefault: true,
        });
        seeded++;
      }
    }

    return { message: `Seeded ${seeded} default notification templates`, seeded };
  }

  // ── Outbox Event Creation ──────────────────────────────────────────────

  /**
   * Creates an outbox_event record. Called by other modules to enqueue
   * notification events for asynchronous processing.
   */
  async createEvent(
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>,
    referenceId?: string,
    referenceType?: string,
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      const id = await this.outboxSharedService.createEvent({
        tenantId,
        eventType,
        payload,
        transaction,
        referenceId,
        referenceType,
      });
      await transaction.commit();
      return id;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Creates an in-app notification directly (bypassing the outbox).
   */
  async createInApp(
    tenantId: string,
    userId: string,
    type: string,
    titleEn: string,
    titleAr: string,
    bodyEn: string,
    bodyAr: string,
    data?: Record<string, unknown>,
  ): Promise<any> {
    const notification = await this.notificationsRepository.create(tenantId, {
      userId,
      type,
      titleEn,
      titleAr,
      bodyEn,
      bodyAr,
      data,
    });

    this.eventsGateway.emitToUser(tenantId, userId, 'notification:new', notification);
    return notification;
  }

  // ── FCM Token Management ──────────────────────────────────────────────

  async registerFcmToken(tenantId: string, userId: string, dto: RegisterFcmTokenDto) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Check if token already exists for this user
    const [existing] = await sequelize.query(
      `SELECT id FROM user_fcm_tokens WHERE token = :token AND "userId" = :userId AND "tenantId" = :tenantId LIMIT 1`,
      { replacements: { token: dto.token, userId, tenantId } },
    );

    if ((existing as any[]).length > 0) {
      // Update existing token to active
      const existingId = (existing as any[])[0].id;
      await sequelize.query(
        `UPDATE user_fcm_tokens SET "isActive" = true, "deviceType" = :deviceType, "updatedAt" = NOW()
         WHERE id = :id`,
        { replacements: { id: existingId, deviceType: dto.deviceType ?? null } },
      );
      return { message: 'FCM token updated', id: existingId };
    }

    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO user_fcm_tokens (id, "tenantId", "userId", token, "deviceType", "isActive", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :userId, :token, :deviceType, true, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          userId,
          token: dto.token,
          deviceType: dto.deviceType ?? null,
        },
      } as any,
    );

    return { message: 'FCM token registered', id };
  }

  async unregisterFcmToken(tenantId: string, userId: string, tokenId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE user_fcm_tokens SET "isActive" = false, "updatedAt" = NOW()
       WHERE id = :tokenId AND "userId" = :userId AND "tenantId" = :tenantId`,
      { replacements: { tokenId, userId, tenantId } } as any,
    );
    return { message: 'FCM token unregistered' };
  }
}
