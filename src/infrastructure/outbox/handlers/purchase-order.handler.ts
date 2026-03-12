import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { PurchaseOrderLinesRepository } from '@/database/sql/repositories/purchase-order-lines.repository';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

@Injectable()
export class PurchaseOrderEventHandler implements IEventHandler {
  private readonly logger = new Logger(PurchaseOrderEventHandler.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly purchaseOrderLinesRepository: PurchaseOrderLinesRepository,
  ) {}

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.event_type) {
      case 'purchase_order.received':
        await this.handleReceived(event.tenant_id, payload);
        break;
      default:
        this.logger.warn(`Unhandled purchase order event type: ${event.event_type}`);
    }
  }

  private async handleReceived(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const orderId = payload.orderId as string;
    const warehouseId = payload.warehouseId as string;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      const lines = (await this.purchaseOrderLinesRepository.findByOrderIdTenant(
        tenantId,
        orderId,
      )) as any[];

      for (const line of lines) {
        if (!line.product_id) continue;

        const productId = line.product_id;
        const receivedQty = parseFloat(line.quantity);
        const unitPrice = parseFloat(line.unit_price);

        // Get current stock level and product cost
        const [stockRows] = await sequelize.query(
          `SELECT sl.quantity, p.cost_price
           FROM stock_levels sl
           JOIN products p ON p.id = sl.product_id
           WHERE sl.product_id = :productId AND sl.warehouse_id = :warehouseId AND sl.tenant_id = :tenantId`,
          { replacements: { productId, warehouseId, tenantId }, transaction },
        );
        const record = (stockRows as any[])[0];
        const currentQty = record ? parseFloat(record.quantity) : 0;
        const currentCost = record?.cost_price ? parseFloat(record.cost_price) : 0;
        const newQty = currentQty + receivedQty;

        // Add to stock_levels.quantity
        await sequelize.query(
          `INSERT INTO stock_levels (id, tenant_id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
           VALUES (gen_random_uuid(), :tenantId, :productId, :warehouseId, :receivedQty, 0, NOW(), NOW())
           ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = stock_levels.quantity + :receivedQty, updated_at = NOW()`,
          {
            replacements: { tenantId, productId, warehouseId, receivedQty },
            transaction,
          },
        );

        // Update products.costPrice using weighted average
        const totalQty = currentQty + receivedQty;
        const newCost =
          totalQty > 0
            ? (currentQty * currentCost + receivedQty * unitPrice) / totalQty
            : unitPrice;

        await sequelize.query(
          `UPDATE products SET cost_price = :newCost, updated_at = NOW()
           WHERE id = :productId AND tenant_id = :tenantId`,
          {
            replacements: { newCost: Math.round(newCost * 100) / 100, productId, tenantId },
            transaction,
          },
        );

        // Create StockMovement for inbound
        await this.stockMovementsRepository.create(
          tenantId,
          {
            productId,
            warehouseId,
            movementType: 'inbound',
            quantity: receivedQty,
            quantityBefore: currentQty,
            quantityAfter: newQty,
            notes: `Received from purchase order ${orderId}`,
            referenceId: orderId,
            referenceType: 'purchase_order',
            createdBy: (payload.userId as string) ?? null,
          },
          transaction,
        );
      }

      await transaction.commit();
      this.logger.log(`Purchase order ${orderId} received: stock updated for tenant ${tenantId}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
