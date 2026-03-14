import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StockLevelsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }

  async findByProductAndWarehouse(
    tenantId: string,
    productId: string,
    warehouseId: string,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT quantity, "reservedQuantity", "averageCost", "lastCostPrice", "currencyId"
       FROM stock_levels
       WHERE "productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`,
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
      averageCost?: number;
      lastCostPrice?: number;
      currencyId?: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const avgCost = data.averageCost ?? 0;
    const lastCost = data.lastCostPrice ?? 0;
    const currencyId = data.currencyId ?? null;

    await sequelize.query(
      `INSERT INTO stock_levels ("tenantId", "productId", "warehouseId", quantity, "reservedQuantity", "averageCost", "lastCostPrice", "currencyId", "createdAt", "updatedAt")
       VALUES (:tenantId, :productId, :warehouseId, :quantity, 0, :averageCost, :lastCostPrice, :currencyId, NOW(), NOW())
       ON CONFLICT ("tenantId", "productId", "warehouseId") DO UPDATE SET
         quantity = :quantity,
         "averageCost" = :averageCost,
         "lastCostPrice" = :lastCostPrice,
         "currencyId" = COALESCE(:currencyId, stock_levels."currencyId"),
         "updatedAt" = NOW()`,
      {
        replacements: {
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
          averageCost: avgCost,
          lastCostPrice: lastCost,
          currencyId,
        },
        transaction,
      } as any,
    );
  }

  async findStockLevelsByProduct(tenantId: string, productId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sl.*, w."nameEn" as "warehouseNameEn", w."nameAr" as "warehouseNameAr"
       FROM stock_levels sl
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       WHERE sl."productId" = :productId AND sl."tenantId" = :tenantId`,
      { replacements: { productId, tenantId } },
    );
    return rows as unknown as any[];
  }

  async getValuationReport(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         sl."productId",
         p."nameEn" as "productNameEn",
         p."nameAr" as "productNameAr",
         p.sku,
         sl."warehouseId",
         w."nameEn" as "warehouseNameEn",
         w."nameAr" as "warehouseNameAr",
         sl.quantity as "currentQty",
         sl."averageCost",
         (sl.quantity * sl."averageCost") as "totalValue"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       WHERE sl."tenantId" = :tenantId AND sl.quantity > 0
       ORDER BY p."nameEn", w."nameEn"`,
      { replacements: { tenantId } },
    );

    const items = rows as unknown as any[];
    const grandTotal = items.reduce(
      (sum: number, row: any) => sum + parseFloat(row.totalValue || '0'),
      0,
    );

    return { items, grandTotal: Math.round(grandTotal * 100) / 100 };
  }

  async findAllWithDetails(
    tenantId: string,
    options: { limit: number; offset: number; search?: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search } = options;

    const whereClause = search ? `AND (p."nameEn" ILIKE :search OR p."nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT sl.*, p."nameEn" as "productNameEn", p."nameAr" as "productNameAr", p.sku, p."reorderPoint", w."nameEn" as "warehouseNameEn", w."nameAr" as "warehouseNameAr"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       WHERE sl."tenantId" = :tenantId ${whereClause}
       ORDER BY p."nameEn" LIMIT :limit OFFSET :offset`,
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
      `SELECT sl.*, p."nameEn" as "productName", p.sku, p."reorderPoint", w."nameEn" as "warehouseName"
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
