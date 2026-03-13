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
      `SELECT quantity FROM stock_levels WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
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
      `INSERT INTO stock_levels (id, "tenantId", "productId", "warehouseId", quantity, "reservedQuantity", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :warehouseId, :quantity, 0, NOW(), NOW())
       ON CONFLICT ("productId", "warehouseId") DO UPDATE SET quantity = :quantity, "updatedAt" = NOW()`,
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
      `SELECT sl.*, p.name as "productName", p.sku, p."reorderPoint", w.name as "warehouseName"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       WHERE sl."tenantId" = :tenantId ${whereClause}
       ORDER BY p.name->>'en' LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       WHERE sl."tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findAvailability(tenantId: string, productId: string, warehouseId?: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    if (warehouseId) {
      const [rows] = await sequelize.query(
        `SELECT quantity, "reservedQuantity", "warehouseId" FROM stock_levels
         WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
        {
          replacements: { productId, warehouseId, tenantId },
        } as any,
      );
      return (rows as unknown as any[])[0] ?? null;
    }

    // Aggregate across all warehouses when no warehouseId specified
    const [rows] = await sequelize.query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity,
              COALESCE(SUM("reservedQuantity"), 0) as "reservedQuantity"
       FROM stock_levels
       WHERE "productId" = :productId AND "tenantId" = :tenantId`,
      {
        replacements: { productId, tenantId },
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findLowStockAlerts(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sl.*, p.name as "productName", p.sku, p."reorderPoint", w.name as "warehouseName"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       WHERE sl.quantity <= p."reorderPoint" AND sl."tenantId" = :tenantId
       ORDER BY sl.quantity ASC`,
      { replacements: { tenantId } },
    );
    return rows;
  }
}
