import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

/**
 * LeaveRequestEventHandler — stub pending TypeORM migration of notifications/employees repos.
 */
@Injectable()
export class LeaveRequestEventHandler implements IEventHandler {
  private readonly logger = new Logger(LeaveRequestEventHandler.name);

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'leave_request.created':
        this.logger.log(
          `LeaveRequestEventHandler: leave_request.created stub for ${payload.leaveRequestId} in tenant ${event.tenantId}`,
        );
        break;
      case 'leave_request.status_changed':
        this.logger.log(
          `LeaveRequestEventHandler: leave_request.status_changed stub for ${payload.leaveRequestId} in tenant ${event.tenantId}`,
        );
        break;
      default:
        this.logger.warn(`Unhandled leave request event type: ${event.eventType}`);
    }
  }
}
