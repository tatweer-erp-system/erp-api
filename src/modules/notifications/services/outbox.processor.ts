import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { NotificationsService } from './notifications.service';
import { NotificationTemplatesRepository } from '@/database/sql/repositories/notification-templates.repository';
import { TenantStatus } from '@/common/enums/tenant.enums';
import { OutboxEventStatus } from '@/common/enums/notification.enums';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

const MAX_ATTEMPTS = 3;
const BATCH_LIMIT = 50;

interface OutboxEvent {
  id: string;
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown> | string;
  status: string;
  attempts: number;
  lastError: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

/** Maps event types to their notification channels and target resolution strategy */
const EVENT_CHANNEL_MAP: Record<string, { channels: string[]; targetType: string }> = {
  pos_checkout: { channels: ['push', 'email'], targetType: 'customer' },
  loyalty_earn: { channels: ['push'], targetType: 'customer' },
  loyalty_tier_upgrade: { channels: ['push', 'email'], targetType: 'customer' },
  low_stock_alert: { channels: ['in_app'], targetType: 'branch_manager' },
  contract_expiry_warning: { channels: ['in_app', 'email'], targetType: 'employee_hr' },
  purchase_order_due: { channels: ['in_app'], targetType: 'procurement' },
  lead_closing_soon: { channels: ['in_app'], targetType: 'sales_rep' },
  payroll_approved: { channels: ['in_app'], targetType: 'employees' },
  contract_expired: { channels: ['in_app'], targetType: 'employee_hr' },
  loyalty_points_expired: { channels: ['push'], targetType: 'customer' },
};

@Injectable()
export class NotificationOutboxProcessor {
  private readonly logger = new Logger(NotificationOutboxProcessor.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly notificationsService: NotificationsService,
    private readonly templatesRepository: NotificationTemplatesRepository,
  ) {}

  @Cron('*/30 * * * * *')
  async processOutbox(): Promise<void> {
    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    const [tenants] = await sharedSequelize.query(
      `SELECT slug, id FROM tenants WHERE status = :activeStatus ORDER BY slug ASC`,
      { replacements: { activeStatus: TenantStatus.ACTIVE } },
    );

    const tenantList = tenants as { slug: string; id: string }[];
    let totalProcessed = 0;

    for (const tenant of tenantList) {
      try {
        const processed = await this.processTenantEvents(tenant.id, tenant.slug);
        totalProcessed += processed;
      } catch (err) {
        this.logger.error(
          `Error processing outbox for tenant ${tenant.slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (totalProcessed > 0) {
      this.logger.log(
        `Processed ${totalProcessed} notification outbox events across ${tenantList.length} tenants`,
      );
    }
  }

  private async processTenantEvents(tenantId: string, tenantSlug: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Use FOR UPDATE SKIP LOCKED for safe concurrent processing
    const [events] = await sequelize.query(
      `SELECT id, "tenantId", "eventType", payload, status, attempts, "lastError", "referenceId", "referenceType", "createdAt"
       FROM outbox_events
       WHERE status = :pending AND "tenantId" = :tenantId AND attempts < :maxAttempts
       ORDER BY "createdAt" ASC
       LIMIT :limit
       FOR UPDATE SKIP LOCKED`,
      {
        replacements: {
          pending: OutboxEventStatus.PENDING,
          tenantId,
          maxAttempts: MAX_ATTEMPTS,
          limit: BATCH_LIMIT,
        },
      },
    );

    const eventList = events as OutboxEvent[];
    let processed = 0;

    for (const event of eventList) {
      // Only process events that match our notification event types
      if (!EVENT_CHANNEL_MAP[event.eventType]) {
        continue;
      }

      try {
        await this.handleEvent(event, tenantSlug);
        await this.markAsDelivered(tenantId, event.id);
        processed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const newAttempts = event.attempts + 1;

        if (newAttempts >= MAX_ATTEMPTS) {
          await this.markAsFailed(tenantId, event.id, errorMessage);
          this.logger.error(msg(ErrorMessages.OUTBOX_MAX_ATTEMPTS, event.eventType));
        } else {
          await this.incrementAttempts(tenantId, event.id, errorMessage);
        }
      }
    }

    return processed;
  }

  private async handleEvent(event: OutboxEvent, tenantSlug: string): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
    const channelConfig = EVENT_CHANNEL_MAP[event.eventType];

    if (!channelConfig) {
      this.logger.warn(`No channel configuration for event type: ${event.eventType}`);
      return;
    }

    // Resolve template for this event type
    const template = await this.templatesRepository.findByEventAndChannel(
      event.tenantId,
      event.eventType,
      channelConfig.channels[0],
    );

    // Determine preferred language (default to EN)
    const preferredLang = (payload.preferredLang as string) ?? 'en';

    // Render title and body from template or use payload defaults
    let titleEn: string;
    let titleAr: string;
    let bodyEn: string;
    let bodyAr: string;

    if (template) {
      titleEn = this.renderTemplate(template.subjectEn ?? '', payload);
      titleAr = this.renderTemplate(template.subjectAr ?? '', payload);
      bodyEn = this.renderTemplate(template.bodyEn, payload);
      bodyAr = this.renderTemplate(template.bodyAr, payload);
    } else {
      // Fallback: use payload values directly
      titleEn = (payload.titleEn as string) ?? event.eventType;
      titleAr = (payload.titleAr as string) ?? event.eventType;
      bodyEn = (payload.bodyEn as string) ?? '';
      bodyAr = (payload.bodyAr as string) ?? '';
    }

    // Resolve target user(s) based on event type
    const userIds = await this.resolveTargetUsers(event, payload);

    if (userIds.length === 0) {
      this.logger.warn(`No target users found for event ${event.id} (type: ${event.eventType})`);
      return;
    }

    // Create in-app notifications and dispatch via channels
    for (const userId of userIds) {
      // Create in-app notification
      if (channelConfig.channels.includes('in_app')) {
        await this.notificationsService.sendInAppLegacy(event.tenantId, userId, {
          type: event.eventType,
          titleEn,
          titleAr,
          bodyEn,
          bodyAr,
          data: payload,
        });
      }

      // Dispatch push notifications via existing queue
      if (channelConfig.channels.includes('push')) {
        const title = preferredLang === 'ar' ? titleAr : titleEn;
        const body = preferredLang === 'ar' ? bodyAr : bodyEn;
        const stringData = Object.fromEntries(
          Object.entries(payload).map(([k, v]) => [k, String(v)]),
        );
        await this.notificationsService.sendPush(event.tenantId, userId, title, body, stringData);
      }

      // Dispatch email via existing queue
      if (channelConfig.channels.includes('email')) {
        const userEmail = await this.getUserEmail(event.tenantId, userId);
        if (userEmail) {
          await this.notificationsService.sendEmail(userEmail, event.eventType, {
            titleEn,
            titleAr,
            bodyEn,
            bodyAr,
            ...payload,
          });
        }
      }
    }
  }

  /**
   * Replaces {{varName}} placeholders with values from the payload.
   */
  private renderTemplate(templateStr: string, payload: Record<string, unknown>): string {
    return templateStr.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = payload[key];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Resolves target user IDs based on the event type and payload.
   */
  private async resolveTargetUsers(
    event: OutboxEvent,
    payload: Record<string, unknown>,
  ): Promise<string[]> {
    const channelConfig = EVENT_CHANNEL_MAP[event.eventType];
    if (!channelConfig) return [];

    // If payload directly specifies userId(s), use them
    if (payload.userId) {
      return [payload.userId as string];
    }
    if (payload.userIds && Array.isArray(payload.userIds)) {
      return payload.userIds as string[];
    }

    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    switch (channelConfig.targetType) {
      case 'customer': {
        const customerId = payload.customerId as string;
        if (!customerId) return [];
        // Look up user linked to this customer
        const [rows] = await sequelize.query(
          `SELECT id FROM users WHERE id = :customerId AND "tenantId" = :tenantId AND "isActive" = true AND "deletedAt" IS NULL LIMIT 1`,
          { replacements: { customerId, tenantId: event.tenantId } },
        );
        return (rows as { id: string }[]).map((r) => r.id);
      }

      case 'branch_manager': {
        const branchId = payload.branchId as string;
        if (!branchId) return [];
        const [rows] = await sequelize.query(
          `SELECT DISTINCT u.id
           FROM users u
           JOIN user_roles ur ON ur."userId" = u.id AND ur."tenantId" = :tenantId
           JOIN "rolePermissions" rp ON rp."roleId" = ur."roleId"
           JOIN permissions p ON p.id = rp."permissionId" AND p."tenantId" = :tenantId
           WHERE u."tenantId" = :tenantId AND u."isActive" = true AND u."deletedAt" IS NULL
             AND p.module = 'inventory' AND p.action = 'view' AND p."deletedAt" IS NULL`,
          { replacements: { tenantId: event.tenantId } },
        );
        return (rows as { id: string }[]).map((r) => r.id);
      }

      case 'employee_hr': {
        const employeeUserId = payload.employeeUserId as string;
        const userIds: string[] = [];
        if (employeeUserId) userIds.push(employeeUserId);

        // Also find HR users
        const [hrRows] = await sequelize.query(
          `SELECT DISTINCT u.id
           FROM users u
           JOIN user_roles ur ON ur."userId" = u.id AND ur."tenantId" = :tenantId
           JOIN "rolePermissions" rp ON rp."roleId" = ur."roleId"
           JOIN permissions p ON p.id = rp."permissionId" AND p."tenantId" = :tenantId
           WHERE u."tenantId" = :tenantId AND u."isActive" = true AND u."deletedAt" IS NULL
             AND p.module = 'hr' AND p.action = 'manage' AND p."deletedAt" IS NULL`,
          { replacements: { tenantId: event.tenantId } },
        );
        const hrUserIds = (hrRows as { id: string }[]).map((r) => r.id);
        return [...new Set([...userIds, ...hrUserIds])];
      }

      case 'procurement': {
        const [rows] = await sequelize.query(
          `SELECT DISTINCT u.id
           FROM users u
           JOIN user_roles ur ON ur."userId" = u.id AND ur."tenantId" = :tenantId
           JOIN "rolePermissions" rp ON rp."roleId" = ur."roleId"
           JOIN permissions p ON p.id = rp."permissionId" AND p."tenantId" = :tenantId
           WHERE u."tenantId" = :tenantId AND u."isActive" = true AND u."deletedAt" IS NULL
             AND p.module = 'purchasing' AND p.action = 'view' AND p."deletedAt" IS NULL`,
          { replacements: { tenantId: event.tenantId } },
        );
        return (rows as { id: string }[]).map((r) => r.id);
      }

      case 'sales_rep': {
        const assignedTo = payload.assignedTo as string;
        if (assignedTo) return [assignedTo];
        return [];
      }

      case 'employees': {
        // For payroll_approved, notify all employees in the payload's employee list
        if (payload.employeeUserIds && Array.isArray(payload.employeeUserIds)) {
          return payload.employeeUserIds as string[];
        }
        return [];
      }

      default:
        return [];
    }
  }

  private async getUserEmail(tenantId: string, userId: string): Promise<string | null> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT email FROM users WHERE id = :userId AND "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { userId, tenantId } },
    );
    const user = (rows as { email: string }[])[0];
    return user?.email ?? null;
  }

  private async markAsDelivered(tenantId: string, eventId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE outbox_events SET status = :delivered, "processedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = :eventId AND "tenantId" = :tenantId`,
      {
        replacements: {
          delivered: OutboxEventStatus.DELIVERED,
          eventId,
          tenantId,
        },
      },
    );
  }

  private async markAsFailed(tenantId: string, eventId: string, error: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE outbox_events SET
        attempts = attempts + 1,
        "lastError" = :error,
        status = :failed,
        "updatedAt" = NOW()
       WHERE id = :eventId AND "tenantId" = :tenantId`,
      {
        replacements: {
          eventId,
          tenantId,
          error,
          failed: OutboxEventStatus.FAILED,
        },
      },
    );
  }

  private async incrementAttempts(tenantId: string, eventId: string, error: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE outbox_events SET
        attempts = attempts + 1,
        "lastError" = :error,
        "updatedAt" = NOW()
       WHERE id = :eventId AND "tenantId" = :tenantId`,
      {
        replacements: { eventId, tenantId, error },
      },
    );
  }
}
