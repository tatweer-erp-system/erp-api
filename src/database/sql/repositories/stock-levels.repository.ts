import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StockLevelsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByProductAndWarehouse(
    tenantId: string,
    productId: string,
    warehouseId: string,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT quantity FROM stock_levels WHERE product_id = :productId AND warehouse_id = :warehouseId AND tenant_id = :tenantId`,
      {
        replacements: { productId, warehouseId, tenantId },
        transaction,
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async upsert(
    tenantId: string,
    data: {
      productId: string;
      warehouseId: string;
      quantity: number;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO stock_levels (id, tenant_id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
       VALUES (:id, :tenantId, :productId, :warehouseId, :quantity, 0, NOW(), NOW())
       ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = :quantity, updated_at = NOW()`,
      {
        replacements: {
          id: uuidv4(),
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
        },
        transaction,
      } as any,
    );
  }

  async findAllWithDetails(
    tenantId: string,
    options: { limit: number; offset: number; search?: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search } = options;

    const whereClause = search
      ? `AND (p.name->>'en' ILIKE :search OR p.name->>'ar' ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT sl.*, p.name as product_name, p.sku, p.reorder_point, w.name as warehouse_name
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = sl.warehouse_id AND w.deleted_at IS NULL
       WHERE sl.tenant_id = :tenantId ${whereClause}
       ORDER BY p.name->>'en' LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = sl.warehouse_id AND w.deleted_at IS NULL
       WHERE sl.tenant_id = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findAvailability(tenantId: string, productId: string, warehouseId?: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    if (warehouseId) {
      const [rows] = await sequelize.query(
        `SELECT quantity, reserved_quantity, warehouse_id FROM stock_levels
         WHERE product_id = :productId AND warehouse_id = :warehouseId AND tenant_id = :tenantId`,
        {
          replacements: { productId, warehouseId, tenantId },
        } as any,
      );
      return (rows as unknown as any[])[0] ?? null;
    }

    // Aggregate across all warehouses when no warehouseId specified
    const [rows] = await sequelize.query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity,
              COALESCE(SUM(reserved_quantity), 0) as reserved_quantity
       FROM stock_levels
       WHERE product_id = :productId AND tenant_id = :tenantId`,
      {
        replacements: { productId, tenantId },
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findLowStockAlerts(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sl.*, p.name as product_name, p.sku, p.reorder_point, w.name as warehouse_name
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = sl.warehouse_id AND w.deleted_at IS NULL
       WHERE sl.quantity <= p.reorder_point AND sl.tenant_id = :tenantId
       ORDER BY sl.quantity ASC`,
      { replacements: { tenantId } },
    );
    return rows;
  }
}
