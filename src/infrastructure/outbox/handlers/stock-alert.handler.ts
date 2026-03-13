import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { NotificationsRepository } from '@/database/sql/repositories/notifications.repository';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

@Injectable()
export class StockAlertHandler implements IEventHandler {
  private readonly logger = new Logger(StockAlertHandler.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'stock.low_reorder_point':
        await this.handleLowStock(event.tenantId, payload);
        break;
      default:
        this.logger.warn(`Unhandled stock alert event type: ${event.eventType}`);
    }
  }

  private async handleLowStock(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const productId = payload.productId as string;
    const productName = payload.productName as Record<string, string>;
    const currentQty = payload.currentQty as number;
    const reorderPoint = payload.reorderPoint as number;
    const warehouseId = payload.warehouseId as string;

    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Find users with 'inventory:view' permission through roles
    const [userRows] = await sequelize.query(
      `SELECT DISTINCT u.id
       FROM users u
       JOIN user_roles ur ON ur."userId" = u.id AND ur."tenantId" = :tenantId
       JOIN "rolePermissions" rp ON rp."roleId" = ur."roleId"
       JOIN permissions p ON p.id = rp."permissionId" AND p."tenantId" = :tenantId
       WHERE u."tenantId" = :tenantId AND u."isActive" = true AND u."deletedAt" IS NULL
         AND p.module = 'inventory' AND p.action = 'view' AND p."deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    const users = userRows as any[];

    if (users.length === 0) {
      this.logger.warn(`No users with inventory:view permission found for tenant ${tenantId}`);
      return;
    }

    const displayName = productName?.en || productName?.ar || productId;

    for (const user of users) {
      await this.notificationsRepository.create(tenantId, {
        userId: user.id,
        type: 'inventory.low_stock',
        title: 'Low Stock Alert',
        body: `Product "${displayName}" has reached low stock level (${currentQty} remaining, reorder point: ${reorderPoint})`,
        data: {
          productId,
          productName,
          currentQty,
          reorderPoint,
          warehouseId,
        },
      });
    }

    this.logger.log(
      `Low stock alert sent to ${users.length} users for product ${productId} in tenant ${tenantId}`,
    );
  }
}
