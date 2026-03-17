import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { SalesOrderLinesRepository } from '@/database/sql/repositories/sales-order-lines.repository';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { LeadsRepository } from '@/database/sql/repositories/leads.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { StockAlertUtil } from './stock-alert.util';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';
import { StockReferenceType } from '@/common/enums/inventory.enums';

@Injectable()
export class SalesOrderEventHandler implements IEventHandler {
  private readonly logger = new Logger(SalesOrderEventHandler.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly salesOrderLinesRepository: SalesOrderLinesRepository,
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly leadsRepository: LeadsRepository,
    private readonly outboxService: OutboxSharedService,
    private readonly stockAlertUtil: StockAlertUtil,
  ) {}

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'sales_order.confirmed':
        await this.handleConfirmed(event.tenantId, payload);
        break;
      case 'sales_order.delivered':
        await this.handleDelivered(event.tenantId, payload);
        break;
      case 'sales_order.cancelled':
        await this.handleCancelled(event.tenantId, payload);
        break;
      default:
        this.logger.warn(`Unhandled sales order event type: ${event.eventType}`);
    }
  }

  private async handleConfirmed(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const orderId = payload.orderId as string;
    const warehouseId = payload.warehouseId as string;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      const lines = (await this.salesOrderLinesRepository.findLinesByOrderId(
        tenantId,
        orderId,
      )) as any[];

      for (const line of lines) {
        if (!line.productId) continue;

        const productId = line.productId;
        const quantity = parseFloat(line.quantity);

        // Reserve quantity in stock_levels
        await sequelize.query(
          `UPDATE stock_levels
           SET "reservedQuantity" = "reservedQuantity" + :quantity, "updatedAt" = NOW()
           WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
          {
            replacements: { quantity, productId, warehouseId, tenantId },
            transaction,
          },
        );

        // Get current stock level for movement record
        const [stockRows] = await sequelize.query(
          `SELECT quantity, "reservedQuantity" FROM stock_levels
           WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
          { replacements: { productId, warehouseId, tenantId }, transaction },
        );
        const stockLevel = (stockRows as any[])[0];
        const currentQty = stockLevel ? parseFloat(stockLevel.quantity) : 0;

        // Create StockMovement for reservation
        await this.stockMovementsRepository.create(
          tenantId,
          {
            productId,
            warehouseId,
            movementType: 'reservation',
            quantity,
            quantityBefore: currentQty,
            quantityAfter: currentQty, // Available stock unchanged, only reserved_quantity changes
            notes: `Stock reserved for sales order ${orderId}`,
            referenceId: orderId,
            referenceType: StockReferenceType.SALES_ORDER,
            createdBy: (payload.userId as string) ?? null,
          },
          transaction,
        );
      }

      // If partnerId exists and open Lead exists for that partner, mark leads as won
      const partnerId = (payload.partnerId ?? payload.contactId) as string | undefined;
      if (partnerId) {
        await sequelize.query(
          `UPDATE leads SET "isWon" = true, probability = 100, "wonAt" = NOW(), "updatedAt" = NOW()
           WHERE "partnerId" = :partnerId AND "tenantId" = :tenantId
             AND "deletedAt" IS NULL AND "isWon" = false AND "isLost" = false`,
          {
            replacements: {
              partnerId,
              tenantId,
            },
            transaction,
          },
        );
      }

      await transaction.commit();
      this.logger.log(`Sales order ${orderId} confirmed: stock reserved for tenant ${tenantId}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async handleDelivered(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const orderId = payload.orderId as string;
    const warehouseId = payload.warehouseId as string;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      const lines = (await this.salesOrderLinesRepository.findLinesByOrderId(
        tenantId,
        orderId,
      )) as any[];

      for (const line of lines) {
        if (!line.productId) continue;

        const productId = line.productId;
        const quantity = parseFloat(line.quantity);

        // Get current stock level
        const [stockRows] = await sequelize.query(
          `SELECT quantity, "reservedQuantity" FROM stock_levels
           WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
          { replacements: { productId, warehouseId, tenantId }, transaction },
        );
        const stockLevel = (stockRows as any[])[0];
        const currentQty = stockLevel ? parseFloat(stockLevel.quantity) : 0;
        const newQty = currentQty - quantity;

        // Deduct from quantity and release reservation
        await sequelize.query(
          `UPDATE stock_levels
           SET quantity = quantity - :quantity,
               "reservedQuantity" = GREATEST("reservedQuantity" - :quantity, 0),
               "updatedAt" = NOW()
           WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
          {
            replacements: { quantity, productId, warehouseId, tenantId },
            transaction,
          },
        );

        // Create StockMovement for outbound
        await this.stockMovementsRepository.create(
          tenantId,
          {
            productId,
            warehouseId,
            movementType: 'outbound',
            quantity,
            quantityBefore: currentQty,
            quantityAfter: newQty,
            notes: `Delivered for sales order ${orderId}`,
            referenceId: orderId,
            referenceType: StockReferenceType.SALES_ORDER,
            createdBy: (payload.userId as string) ?? null,
          },
          transaction,
        );

        // Check for low stock alert
        await this.stockAlertUtil.checkAndCreateAlert(
          tenantId,
          productId,
          warehouseId,
          transaction,
        );
      }

      await transaction.commit();
      this.logger.log(`Sales order ${orderId} delivered: stock deducted for tenant ${tenantId}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async handleCancelled(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const orderId = payload.orderId as string;
    const warehouseId = payload.warehouseId as string;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      const lines = (await this.salesOrderLinesRepository.findLinesByOrderId(
        tenantId,
        orderId,
      )) as any[];

      for (const line of lines) {
        if (!line.productId) continue;

        const productId = line.productId;
        const quantity = parseFloat(line.quantity);

        // Release reservation
        await sequelize.query(
          `UPDATE stock_levels
           SET "reservedQuantity" = GREATEST("reservedQuantity" - :quantity, 0),
               "updatedAt" = NOW()
           WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
          {
            replacements: { quantity, productId, warehouseId, tenantId },
            transaction,
          },
        );

        // Get current stock level
        const [stockRows] = await sequelize.query(
          `SELECT quantity FROM stock_levels
           WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
          { replacements: { productId, warehouseId, tenantId }, transaction },
        );
        const stockLevel = (stockRows as any[])[0];
        const currentQty = stockLevel ? parseFloat(stockLevel.quantity) : 0;

        // Create StockMovement for reservation released
        await this.stockMovementsRepository.create(
          tenantId,
          {
            productId,
            warehouseId,
            movementType: 'reservation_released',
            quantity,
            quantityBefore: currentQty,
            quantityAfter: currentQty, // Available stock unchanged
            notes: `Reservation released for cancelled sales order ${orderId}`,
            referenceId: orderId,
            referenceType: StockReferenceType.SALES_ORDER,
            createdBy: (payload.userId as string) ?? null,
          },
          transaction,
        );
      }

      await transaction.commit();
      this.logger.log(
        `Sales order ${orderId} cancelled: reservations released for tenant ${tenantId}`,
      );
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
