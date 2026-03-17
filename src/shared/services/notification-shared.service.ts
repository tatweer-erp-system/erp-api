import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';
import { MailService, MailJobData } from '@/infrastructure/mail/mail.service';
import { EventsGateway } from '@/infrastructure/websockets/events.gateway';
import { QUEUE_FCM, QUEUE_SMS } from '@/infrastructure/queues/queue.constants';

/**
 * Outbox event types for cross-module notifications.
 * Used as the eventType parameter in OutboxSharedService.createEvent().
 */
export const NotificationEventTypes = {
  // POS & Sales
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  LOW_STOCK_ALERT: 'low_stock_alert',
  LOYALTY_POINTS_EARNED: 'LOYALTY_POINTS_EARNED',
  LOYALTY_POINTS_REDEEMED: 'LOYALTY_POINTS_REDEEMED',

  // Invoices & Payments
  INVOICE_POSTED: 'INVOICE_POSTED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',

  // Inventory & Warehouse
  DELIVERY_VALIDATED: 'DELIVERY_VALIDATED',
  RECEIPT_VALIDATED: 'RECEIPT_VALIDATED',

  // HR
  CONTRACT_EXPIRING: 'CONTRACT_EXPIRING',
  LEAVE_APPROVED: 'LEAVE_APPROVED',

  // Sales
  SALES_ORDER_CONFIRMED: 'SALES_ORDER_CONFIRMED',

  // Purchasing
  PURCHASE_ORDER_CONFIRMED: 'PURCHASE_ORDER_CONFIRMED',

  // ZATCA
  ZATCA_SUBMISSION_FAILED: 'ZATCA_SUBMISSION_FAILED',
} as const;

export type NotificationEventType =
  (typeof NotificationEventTypes)[keyof typeof NotificationEventTypes];

@Injectable()
export class NotificationSharedService {
  private readonly logger = new Logger(NotificationSharedService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
    private readonly eventsGateway: EventsGateway,
    @InjectQueue(QUEUE_FCM) private readonly fcmQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
  ) {}

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
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    this.logger.debug(`FCM push queued for user ${userId}`);
  }

  async sendSms(phone: string, message: string): Promise<void> {
    await this.smsQueue.add(
      'send',
      { phone, message },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    this.logger.debug(`SMS queued to ${phone}`);
  }

  async sendEmail(data: MailJobData): Promise<void> {
    await this.mailService.sendEmail(data);
  }

  async sendInApp(
    tenantSlug: string,
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.eventsGateway.emitToUser(tenantSlug, userId, event, payload);
    this.logger.debug(`In-app notification sent to user ${userId}`);
  }

  emitToRole(tenantSlug: string, roleName: string, event: string, data: unknown): void {
    this.eventsGateway.emitToRole(tenantSlug, roleName, event, data);
  }

  emitToTenant(tenantSlug: string, event: string, data: unknown): void {
    this.eventsGateway.emitToTenant(tenantSlug, event, data);
  }
}
