import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

/**
 * LeadEventHandler — stub pending TypeORM migration of leads/sales-order repos.
 */
@Injectable()
export class LeadEventHandler implements IEventHandler {
  private readonly logger = new Logger(LeadEventHandler.name);

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'lead.won':
        this.logger.log(
          `LeadEventHandler: lead.won stub for lead ${payload.leadId} in tenant ${event.tenantId}`,
        );
        break;
      default:
        this.logger.warn(`Unhandled lead event type: ${event.eventType}`);
    }
  }
}
