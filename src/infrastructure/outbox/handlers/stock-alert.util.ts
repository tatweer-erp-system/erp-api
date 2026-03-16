import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';

/**
 * Utility that runs after every StockMovement that reduces stock.
 * Checks if the new quantity <= product's reorder_point.
 * If yes, creates an outbox event with type 'stock.low_reorder_point'.
 */
@Injectable()
export class StockAlertUtil {
  private readonly logger = new Logger(StockAlertUtil.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly outboxService: OutboxSharedService,
  ) {}

  async checkAndCreateAlert(
    tenantId: string,
    productId: string,
    warehouseId: string,
    _transaction?: unknown,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT sl.quantity, p."reorderPoint", p."nameEn" as "productName"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       WHERE sl."productId" = :productId AND sl."warehouseId" = :warehouseId AND sl."tenantId" = :tenantId`,
      { replacements: { productId, warehouseId, tenantId } },
    );

    const record = (rows as any[])[0];
    if (!record) return;

    const currentQty = parseFloat(record.quantity);
    const reorderPoint = parseFloat(record.reorderPoint);

    if (currentQty <= reorderPoint) {
      // Check if there is already a pending alert for this product/warehouse
      const [existingAlerts] = await sequelize.query(
        `SELECT id FROM outbox_events
         WHERE "tenantId" = :tenantId
           AND "eventType" = 'stock.low_reorder_point'
           AND status = 'pending'
           AND "referenceId" = :productId
           AND "referenceType" = 'product'
         LIMIT 1`,
        { replacements: { tenantId, productId } },
      );

      if ((existingAlerts as any[]).length > 0) {
        this.logger.debug(
          `Pending low stock alert already exists for product ${productId}, skipping`,
        );
        return;
      }

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'stock.low_reorder_point',
        payload: {
          productId,
          productName: record.productName,
          currentQty,
          reorderPoint,
          warehouseId,
        },
        referenceId: productId,
        referenceType: 'product',
      });

      this.logger.log(
        `Low stock alert created for product ${productId} (qty: ${currentQty}, reorder: ${reorderPoint})`,
      );
    }
  }
}
