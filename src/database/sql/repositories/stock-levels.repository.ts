import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

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
    options?: {
      locationId?: string | null;
      productVariantId?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    let whereClause = `"productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`;
    const replacements: Record<string, unknown> = { productId, warehouseId, tenantId };

    if (options?.locationId) {
      whereClause += ` AND "locationId" = :locationId`;
      replacements.locationId = options.locationId;
    } else {
      whereClause += ` AND "locationId" IS NULL`;
    }

    if (options?.productVariantId) {
      whereClause += ` AND "productVariantId" = :productVariantId`;
      replacements.productVariantId = options.productVariantId;
    } else {
      whereClause += ` AND "productVariantId" IS NULL`;
    }

    if (options?.lotNumber) {
      whereClause += ` AND "lotNumber" = :lotNumber`;
      replacements.lotNumber = options.lotNumber;
    } else {
      whereClause += ` AND "lotNumber" IS NULL`;
    }

    if (options?.serialNumber) {
      whereClause += ` AND "serialNumber" = :serialNumber`;
      replacements.serialNumber = options.serialNumber;
    } else {
      whereClause += ` AND "serialNumber" IS NULL`;
    }

    const [rows] = await sequelize.query(
      `SELECT quantity, "reservedQuantity", "averageCost", "lastCostPrice", "currencyId", "locationId", "productVariantId", "lotNumber", "serialNumber", "expiryDate"
       FROM stock_levels
       WHERE ${whereClause}`,
      {
        replacements,
        transaction,
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  /**
   * Backward-compatible find: aggregates across all locations/variants for a product+warehouse.
   * Used when location-awareness is not needed (legacy callers).
   */
  async findAggregateByProductAndWarehouse(
    tenantId: string,
    productId: string,
    warehouseId: string,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         COALESCE(SUM(quantity), 0) as quantity,
         COALESCE(SUM("reservedQuantity"), 0) as "reservedQuantity",
         COALESCE(
           CASE WHEN SUM(quantity) > 0
             THEN SUM(quantity * "averageCost") / SUM(quantity)
             ELSE 0
           END, 0
         ) as "averageCost",
         MAX("lastCostPrice") as "lastCostPrice",
         (array_agg("currencyId") FILTER (WHERE "currencyId" IS NOT NULL))[1] as "currencyId"
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
      locationId?: string | null;
      productVariantId?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
      expiryDate?: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const avgCost = data.averageCost ?? 0;
    const lastCost = data.lastCostPrice ?? 0;
    const currencyId = data.currencyId ?? null;
    const locationId = data.locationId ?? null;
    const productVariantId = data.productVariantId ?? null;
    const lotNumber = data.lotNumber ?? null;
    const serialNumber = data.serialNumber ?? null;
    const expiryDate = data.expiryDate ?? null;

    // Build a composite conflict check using a WHERE-based upsert approach
    // Since the unique index is on (tenantId, productId, warehouseId), we handle
    // location/variant/lot/serial via conditional logic
    if (locationId || productVariantId || lotNumber || serialNumber) {
      // Location-aware upsert: check for existing row with all dimensions
      let whereClause = `"tenantId" = :tenantId AND "productId" = :productId AND "warehouseId" = :warehouseId`;
      const replacements: Record<string, unknown> = {
        tenantId,
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        averageCost: avgCost,
        lastCostPrice: lastCost,
        currencyId,
        locationId,
        productVariantId,
        lotNumber,
        serialNumber,
        expiryDate,
      };

      if (locationId) {
        whereClause += ` AND "locationId" = :locationId`;
      } else {
        whereClause += ` AND "locationId" IS NULL`;
      }
      if (productVariantId) {
        whereClause += ` AND "productVariantId" = :productVariantId`;
      } else {
        whereClause += ` AND "productVariantId" IS NULL`;
      }
      if (lotNumber) {
        whereClause += ` AND "lotNumber" = :lotNumber`;
      } else {
        whereClause += ` AND "lotNumber" IS NULL`;
      }
      if (serialNumber) {
        whereClause += ` AND "serialNumber" = :serialNumber`;
      } else {
        whereClause += ` AND "serialNumber" IS NULL`;
      }

      // Try update first
      const [, updateMeta] = await sequelize.query(
        `UPDATE stock_levels SET
           quantity = :quantity,
           "averageCost" = :averageCost,
           "lastCostPrice" = :lastCostPrice,
           "currencyId" = COALESCE(:currencyId, "currencyId"),
           "expiryDate" = COALESCE(:expiryDate, "expiryDate"),
           "updatedAt" = NOW()
         WHERE ${whereClause}`,
        { replacements, transaction } as any,
      );

      const rowsUpdated = (updateMeta as any)?.rowCount ?? (updateMeta as any)?.length ?? 0;
      if (rowsUpdated === 0) {
        // Insert new row
        await sequelize.query(
          `INSERT INTO stock_levels ("tenantId", "productId", "warehouseId", "locationId", "productVariantId", "lotNumber", "serialNumber", "expiryDate", quantity, "reservedQuantity", "averageCost", "lastCostPrice", "currencyId", "createdAt", "updatedAt")
           VALUES (:tenantId, :productId, :warehouseId, :locationId, :productVariantId, :lotNumber, :serialNumber, :expiryDate, :quantity, 0, :averageCost, :lastCostPrice, :currencyId, NOW(), NOW())`,
          { replacements, transaction } as any,
        );
      }
    } else {
      // Legacy upsert: use the existing unique constraint on (tenantId, productId, warehouseId)
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
  }

  async findStockLevelsByProduct(tenantId: string, productId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sl.*, w."nameEn" as "warehouseNameEn", w."nameAr" as "warehouseNameAr",
              loc."nameEn" as "locationNameEn", loc."nameAr" as "locationNameAr"
       FROM stock_levels sl
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       LEFT JOIN stock_locations loc ON loc.id = sl."locationId"
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
         SUM(sl.quantity) as "currentQty",
         CASE WHEN SUM(sl.quantity) > 0
           THEN SUM(sl.quantity * sl."averageCost") / SUM(sl.quantity)
           ELSE 0
         END as "averageCost",
         SUM(sl.quantity * sl."averageCost") as "totalValue"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       WHERE sl."tenantId" = :tenantId AND sl.quantity > 0
       GROUP BY sl."productId", p."nameEn", p."nameAr", p.sku, sl."warehouseId", w."nameEn", w."nameAr"
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
      `SELECT sl.*, p."nameEn" as "productNameEn", p."nameAr" as "productNameAr", p.sku, p."reorderPoint",
              w."nameEn" as "warehouseNameEn", w."nameAr" as "warehouseNameAr",
              loc."nameEn" as "locationNameEn", loc."nameAr" as "locationNameAr"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = sl."warehouseId" AND w."deletedAt" IS NULL
       LEFT JOIN stock_locations loc ON loc.id = sl."locationId"
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
        `SELECT COALESCE(SUM(quantity), 0) as quantity,
                COALESCE(SUM("reservedQuantity"), 0) as "reservedQuantity",
                :warehouseId as "warehouseId"
         FROM stock_levels
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
      `SELECT agg."productId", agg."warehouseId",
              agg.total_qty as quantity, agg.total_reserved as "reservedQuantity",
              p."nameEn" as "productName", p.sku, p."reorderPoint",
              w."nameEn" as "warehouseName"
       FROM (
         SELECT "productId", "warehouseId",
                SUM(quantity) as total_qty,
                SUM("reservedQuantity") as total_reserved
         FROM stock_levels
         WHERE "tenantId" = :tenantId
         GROUP BY "productId", "warehouseId"
       ) agg
       JOIN products p ON p.id = agg."productId" AND p."deletedAt" IS NULL
       JOIN warehouses w ON w.id = agg."warehouseId" AND w."deletedAt" IS NULL
       WHERE agg.total_qty <= p."reorderPoint"
       ORDER BY agg.total_qty ASC`,
      { replacements: { tenantId } },
    );
    return rows;
  }

  /**
   * Find stock level by location for location-aware operations.
   */
  async findByProductWarehouseAndLocation(
    tenantId: string,
    productId: string,
    warehouseId: string,
    locationId: string,
    transaction?: any,
    options?: {
      productVariantId?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
    },
  ) {
    return this.findByProductAndWarehouse(tenantId, productId, warehouseId, transaction, {
      locationId,
      productVariantId: options?.productVariantId ?? null,
      lotNumber: options?.lotNumber ?? null,
      serialNumber: options?.serialNumber ?? null,
    });
  }

  /**
   * Find stock locations with stock for a given warehouse.
   */
  async findLocationStockByWarehouse(tenantId: string, warehouseId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sl.*, loc."nameEn" as "locationNameEn", loc."nameAr" as "locationNameAr",
              loc."locationType", p."nameEn" as "productNameEn", p."nameAr" as "productNameAr", p.sku
       FROM stock_levels sl
       JOIN stock_locations loc ON loc.id = sl."locationId"
       JOIN products p ON p.id = sl."productId" AND p."deletedAt" IS NULL
       WHERE sl."warehouseId" = :warehouseId AND sl."tenantId" = :tenantId AND sl.quantity > 0
       ORDER BY loc."nameEn", p."nameEn"`,
      { replacements: { warehouseId, tenantId } },
    );
    return rows;
  }
}
