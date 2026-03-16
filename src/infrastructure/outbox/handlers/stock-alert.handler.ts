import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

/**
 * StockAlertHandler — stub pending TypeORM migration of notifications repo.
 */
@Injectable()
export class StockAlertHandler implements IEventHandler {
  private readonly logger = new Logger(StockAlertHandler.name);

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'stock.low_reorder_point':
        this.logger.log(
          `StockAlertHandler: stock.low_reorder_point stub for product ${payload.productId} in tenant ${event.tenantId}`,
        );
        break;
      default:
        this.logger.warn(`Unhandled stock alert event type: ${event.eventType}`);
    }
  }
}
