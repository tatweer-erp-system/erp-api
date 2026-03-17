import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import {
  QUEUE_OUTBOX,
  QUEUE_MAIL,
  QUEUE_FCM,
  QUEUE_SMS,
} from '@/infrastructure/queues/queue.constants';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import {
  SalesOrderEventHandler,
  PurchaseOrderEventHandler,
  LeaveRequestEventHandler,
  StockAlertHandler,
  EmployeeEventHandler,
  LeadEventHandler,
  OutboxEventPayload,
} from './handlers';
import * as Sentry from '@sentry/node';
import { v7 as uuidv7 } from 'uuid';
import { TenantStatus } from '@/common/enums/tenant.enums';

const MAX_ATTEMPTS = 5;

/** Exponential backoff delays in seconds: 1s, 2s, 4s, 8s, 16s */
const BACKOFF_DELAYS = [1, 2, 4, 8, 16];

@Processor(QUEUE_OUTBOX)
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  private readonly queueMap: Record<string, Queue>;
  private readonly handlerMap: Record<string, { handler: any; method: string }>;

  constructor(
    private readonly outboxService: OutboxSharedService,
    private readonly tenantSequelizeService: TenantSequelizeService,
    @InjectQueue(QUEUE_MAIL) private readonly mailQueue: Queue,
    @InjectQueue(QUEUE_FCM) private readonly fcmQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    private readonly salesOrderHandler: SalesOrderEventHandler,
    private readonly purchaseOrderHandler: PurchaseOrderEventHandler,
    private readonly leaveRequestHandler: LeaveRequestEventHandler,
    private readonly stockAlertHandler: StockAlertHandler,
    private readonly employeeHandler: EmployeeEventHandler,
    private readonly leadHandler: LeadEventHandler,
  ) {
    this.queueMap = {
      SEND_EMAIL: this.mailQueue,
      SEND_FCM: this.fcmQueue,
      SEND_SMS: this.smsQueue,
    };

    this.handlerMap = {
      // Sales order events
      'sales_order.confirmed': { handler: this.salesOrderHandler, method: 'handle' },
      'sales_order.delivered': { handler: this.salesOrderHandler, method: 'handle' },
      'sales_order.cancelled': { handler: this.salesOrderHandler, method: 'handle' },
      // Purchase order events
      'purchase_order.received': { handler: this.purchaseOrderHandler, method: 'handle' },
      // Leave request events
      'leave_request.created': { handler: this.leaveRequestHandler, method: 'handle' },
      'leave_request.status_changed': { handler: this.leaveRequestHandler, method: 'handle' },
      // Stock events
      'stock.low_reorder_point': { handler: this.stockAlertHandler, method: 'handle' },
      // Employee events
      'employee.created': { handler: this.employeeHandler, method: 'handle' },
      // Lead events
      'lead.won': { handler: this.leadHandler, method: 'handle' },
    };
  }

  @Process('poll')
  async handlePoll(job: Job): Promise<void> {
    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    const [tenants] = await sharedSequelize.query(
      `SELECT slug FROM tenants WHERE status = :activeStatus ORDER BY slug ASC`,
      { replacements: { activeStatus: TenantStatus.ACTIVE } },
    );

    const tenantSlugs = (tenants as { slug: string }[]).map((t) => t.slug);

    let totalProcessed = 0;

    for (const tenantSlug of tenantSlugs) {
      const events = await this.outboxService.getPendingEvents(tenantSlug);

      for (const event of events as OutboxEventPayload[]) {
        // Check backoff: skip if not enough time has passed since last attempt
        if (event.attempts > 0 && !this.shouldRetry(event)) {
          continue;
        }

        try {
          await this.routeEvent(event, tenantSlug);
          await this.outboxService.markProcessed(tenantSlug, event.id);
          totalProcessed++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed to process event ${event.id} (type: ${event.eventType}, attempt: ${event.attempts + 1}): ${errorMessage}`,
          );
          await this.outboxService.markFailed(tenantSlug, event.id, errorMessage);

          if (event.attempts + 1 >= MAX_ATTEMPTS) {
            // Event will be marked as 'dead' by markFailed
            this.logger.error(
              `Event ${event.id} (type: ${event.eventType}) reached max attempts, marked as dead`,
            );
            Sentry.captureException(err, {
              tags: { tenantSlug, eventType: event.eventType },
              extra: { eventId: event.id, attempts: event.attempts + 1 },
            });

            // Create a security_event alert for dead letter events
            await this.createSecurityAlert(tenantSlug, event, errorMessage);
          }
        }
      }
    }

    this.logger.log(
      `Processed ${totalProcessed} outbox events across ${tenantSlugs.length} tenants`,
    );
  }

  private async routeEvent(event: OutboxEventPayload, tenantSlug: string): Promise<void> {
    const eventType = event.eventType;

    // Check for legacy queue-based events
    const targetQueue = this.queueMap[eventType];
    if (targetQueue) {
      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
      await targetQueue.add('send', { ...payload, tenantSlug });
      return;
    }

    // Check for domain event handlers
    const handlerEntry = this.handlerMap[eventType];
    if (handlerEntry) {
      await handlerEntry.handler[handlerEntry.method](event);
      return;
    }

    throw new Error(`Unknown event type: ${eventType}`);
  }

  /**
   * Determines if enough time has passed for exponential backoff retry.
   */
  private shouldRetry(event: OutboxEventPayload): boolean {
    if (!event.createdAt) return true;

    const backoffIndex = Math.min(event.attempts - 1, BACKOFF_DELAYS.length - 1);
    const delaySeconds = BACKOFF_DELAYS[backoffIndex];
    const lastAttemptTime = new Date(event.createdAt).getTime();
    const now = Date.now();

    // Use a rough estimate: each attempt adds the cumulative backoff
    const totalBackoff = BACKOFF_DELAYS.slice(0, event.attempts).reduce((a, b) => a + b, 0);
    return now - lastAttemptTime > totalBackoff * 1000;
  }

  /**
   * Creates a security_event alert when an outbox event reaches dead status.
   */
  private async createSecurityAlert(
    tenantSlug: string,
    event: OutboxEventPayload,
    errorMessage: string,
  ): Promise<void> {
    try {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();
      await sequelize.query(
        `INSERT INTO security_events (id, "eventType", "tenantId", metadata, "createdAt")
         VALUES (:id, 'outbox_event_dead', :tenantId, :metadata, NOW())`,
        {
          replacements: {
            id: uuidv7(),
            tenantId: event.tenantId,
            metadata: JSON.stringify({
              outboxEventId: event.id,
              eventType: event.eventType,
              attempts: event.attempts + 1,
              lastError: errorMessage,
              referenceId: event.referenceId,
              referenceType: event.referenceType,
            }),
          },
        },
      );
    } catch (alertError) {
      this.logger.error(
        `Failed to create security alert for dead outbox event ${event.id}: ${alertError}`,
      );
    }
  }
}
