import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

/**
 * EmployeeEventHandler — stub pending full TypeORM migration of employee/sequences repos.
 */
@Injectable()
export class EmployeeEventHandler implements IEventHandler {
  private readonly logger = new Logger(EmployeeEventHandler.name);

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'employee.created':
        this.logger.log(
          `EmployeeEventHandler: employee.created stub for employee ${payload.employeeId} in tenant ${event.tenantId}`,
        );
        break;
      default:
        this.logger.warn(`Unhandled employee event type: ${event.eventType}`);
    }
  }
}
