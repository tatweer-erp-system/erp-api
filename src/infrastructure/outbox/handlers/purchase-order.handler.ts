import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

/**
 * PurchaseOrderEventHandler — stub pending TypeORM migration of stock-movements/purchase-order-lines repos.
 */
@Injectable()
export class PurchaseOrderEventHandler implements IEventHandler {
  private readonly logger = new Logger(PurchaseOrderEventHandler.name);

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'purchase_order.received':
        this.logger.log(
          `PurchaseOrderEventHandler: purchase_order.received stub for order ${payload.orderId} in tenant ${event.tenantId}`,
        );
        break;
      default:
        this.logger.warn(`Unhandled purchase order event type: ${event.eventType}`);
    }
  }
}
