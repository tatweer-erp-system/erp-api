import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { QUEUE_OUTBOX, QUEUE_MAIL, QUEUE_FCM, QUEUE_SMS } from '@/infrastructure/queues/queue.constants';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import * as Sentry from '@sentry/node';

interface OutboxEvent {
  id: string;
  tenant_slug: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

@Processor(QUEUE_OUTBOX)
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  private readonly queueMap: Record<string, Queue>;

  constructor(
    private readonly outboxService: OutboxSharedService,
    private readonly tenantSequelizeService: TenantSequelizeService,
    @InjectQueue(QUEUE_MAIL) private readonly mailQueue: Queue,
    @InjectQueue(QUEUE_FCM) private readonly fcmQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
  ) {
    this.queueMap = {
      SEND_EMAIL: this.mailQueue,
      SEND_FCM: this.fcmQueue,
      SEND_SMS: this.smsQueue,
    };
  }

  @Process('poll')
  async handlePoll(job: Job): Promise<void> {
    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    const [tenants] = await sharedSequelize.query(
      `SELECT slug FROM tenants WHERE status = 'active' ORDER BY slug ASC`,
    );

    const tenantSlugs = (tenants as { slug: string }[]).map((t) => t.slug);

    let totalProcessed = 0;

    for (const tenantSlug of tenantSlugs) {
      const events = await this.outboxService.getPendingEvents(tenantSlug);

      for (const event of events as OutboxEvent[]) {
        const targetQueue = this.queueMap[event.event_type];

        if (!targetQueue) {
          this.logger.warn(
            `Unknown event type: ${event.event_type} for event ${event.id} in tenant ${tenantSlug}`,
          );
          await this.outboxService.markFailed(
            tenantSlug,
            event.id,
            `Unknown event type: ${event.event_type}`,
          );
          continue;
        }

        try {
          const payload =
            typeof event.payload === 'string'
              ? JSON.parse(event.payload)
              : event.payload;

          await targetQueue.add('send', { ...payload, tenantSlug });
          await this.outboxService.markProcessed(tenantSlug, event.id);
          totalProcessed++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          await this.outboxService.markFailed(tenantSlug, event.id, errorMessage);

          if (event.attempts >= 2) {
            // After this failure, attempts will be 3 → status becomes 'failed'
            Sentry.captureException(err, {
              tags: { tenantSlug, eventType: event.event_type },
              extra: { eventId: event.id },
            });
          }
        }
      }
    }

    this.logger.log(
      `Processed ${totalProcessed} outbox events across ${tenantSlugs.length} tenants`,
    );
  }
}
