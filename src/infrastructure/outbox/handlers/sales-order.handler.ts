import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

/**
 * SalesOrderEventHandler — stub pending TypeORM migration of stock/sales-order-lines repos.
 */
@Injectable()
export class SalesOrderEventHandler implements IEventHandler {
  private readonly logger = new Logger(SalesOrderEventHandler.name);

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'sales_order.confirmed':
        this.logger.log(
          `SalesOrderEventHandler: sales_order.confirmed stub for order ${payload.orderId} in tenant ${event.tenantId}`,
        );
        break;
      case 'sales_order.delivered':
        this.logger.log(
          `SalesOrderEventHandler: sales_order.delivered stub for order ${payload.orderId} in tenant ${event.tenantId}`,
        );
        break;
      case 'sales_order.cancelled':
        this.logger.log(
          `SalesOrderEventHandler: sales_order.cancelled stub for order ${payload.orderId} in tenant ${event.tenantId}`,
        );
        break;
      default:
        this.logger.warn(`Unhandled sales order event type: ${event.eventType}`);
    }
  }
}
