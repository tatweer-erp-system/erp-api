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

    switch (event.event_type) {
      case 'stock.low_reorder_point':
        await this.handleLowStock(event.tenant_id, payload);
        break;
      default:
        this.logger.warn(`Unhandled stock alert event type: ${event.event_type}`);
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
       JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = :tenantId
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id AND p.tenant_id = :tenantId
       WHERE u.tenant_id = :tenantId AND u.is_active = true AND u.deleted_at IS NULL
         AND p.module = 'inventory' AND p.action = 'view' AND p.deleted_at IS NULL`,
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
