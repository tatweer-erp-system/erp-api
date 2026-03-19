import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class StockMovementsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantId: string, options: { limit: number; offset: number; sortOrder: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, sortOrder } = options;

    const [rows] = await sequelize.query(
      `SELECT sm.*, p."nameEn" as "productName", w."nameEn" as "warehouseName",
              fl."nameEn" as "fromLocationNameEn", tl."nameEn" as "toLocationNameEn"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses w ON w.id = sm."warehouseId"
       LEFT JOIN stock_locations fl ON fl.id = sm."fromLocationId"
       LEFT JOIN stock_locations tl ON tl.id = sm."toLocationId"
       WHERE sm."tenantId" = :tenantId
       ORDER BY sm."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements: { tenantId, limit, offset } },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_movements WHERE "tenantId" = :tenantId`,
      { replacements: { tenantId } } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sm.*, p."nameEn" as "productName", w."nameEn" as "warehouseName",
              fl."nameEn" as "fromLocationNameEn", tl."nameEn" as "toLocationNameEn"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses w ON w.id = sm."warehouseId"
       LEFT JOIN stock_locations fl ON fl.id = sm."fromLocationId"
       LEFT JOIN stock_locations tl ON tl.id = sm."toLocationId"
       WHERE sm.id = :id AND sm."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      productId: string;
      warehouseId: string;
      movementType: string;
      quantity: number;
      quantityBefore: number;
      quantityAfter: number;
      notes: string | null;
      referenceId: string | null;
      referenceType: string | null;
      createdBy: string | null;
      unitCost?: number;
      totalCost?: number;
      currencyId?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
      expiryDate?: string | null;
      branchId?: string | null;
      fromLocationId?: string | null;
      toLocationId?: string | null;
      productVariantId?: string | null;
      originModel?: string | null;
      originId?: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO stock_movements (id, "tenantId", "productId", "warehouseId", "movementType", quantity, "quantityBefore", "quantityAfter", notes, "referenceId", "referenceType", "createdBy", "unitCost", "totalCost", "currencyId", "lotNumber", "serialNumber", "expiryDate", "branchId", "fromLocationId", "toLocationId", "productVariantId", "originModel", "originId", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :warehouseId, :movementType, :quantity, :quantityBefore, :quantityAfter, :notes, :referenceId, :referenceType, :createdBy, :unitCost, :totalCost, :currencyId, :lotNumber, :serialNumber, :expiryDate, :branchId, :fromLocationId, :toLocationId, :productVariantId, :originModel, :originId, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          ...data,
          unitCost: data.unitCost ?? 0,
          totalCost: data.totalCost ?? 0,
          currencyId: data.currencyId ?? null,
          lotNumber: data.lotNumber ?? null,
          serialNumber: data.serialNumber ?? null,
          expiryDate: data.expiryDate ?? null,
          branchId: data.branchId ?? null,
          fromLocationId: data.fromLocationId ?? null,
          toLocationId: data.toLocationId ?? null,
          productVariantId: data.productVariantId ?? null,
          originModel: data.originModel ?? null,
          originId: data.originId ?? null,
        },
        transaction,
      } as any,
    );
    return id;
  }

  async findByProduct(
    tenantId: string,
    productId: string,
    options: { limit: number; offset: number },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset } = options;

    const [rows] = await sequelize.query(
      `SELECT sm.*, w."nameEn" as "warehouseName",
              fl."nameEn" as "fromLocationNameEn", tl."nameEn" as "toLocationNameEn"
       FROM stock_movements sm
       JOIN warehouses w ON w.id = sm."warehouseId"
       LEFT JOIN stock_locations fl ON fl.id = sm."fromLocationId"
       LEFT JOIN stock_locations tl ON tl.id = sm."toLocationId"
       WHERE sm."productId" = :productId AND sm."tenantId" = :tenantId
       ORDER BY sm."createdAt" DESC LIMIT :limit OFFSET :offset`,
      { replacements: { productId, tenantId, limit, offset } },
    );
    return rows;
  }

  async findByWarehouse(
    tenantId: string,
    warehouseId: string,
    options: { limit: number; offset: number },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset } = options;

    const [rows] = await sequelize.query(
      `SELECT sm.*, p."nameEn" as "productName",
              fl."nameEn" as "fromLocationNameEn", tl."nameEn" as "toLocationNameEn"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       LEFT JOIN stock_locations fl ON fl.id = sm."fromLocationId"
       LEFT JOIN stock_locations tl ON tl.id = sm."toLocationId"
       WHERE sm."warehouseId" = :warehouseId AND sm."tenantId" = :tenantId
       ORDER BY sm."createdAt" DESC LIMIT :limit OFFSET :offset`,
      { replacements: { warehouseId, tenantId, limit, offset } },
    );
    return rows;
  }

  async findAllTransfers(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      sortOrder: string;
      search?: string;
      movementType: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, sortOrder, search, movementType } = options;

    const replacements: Record<string, unknown> = {
      tenantId,
      movementType,
      limit,
      offset,
    };

    let searchClause = '';
    if (search) {
      searchClause = `AND (p."nameEn" ILIKE :search OR p."nameAr" ILIKE :search OR p.sku ILIKE :search OR sw."nameEn" ILIKE :search OR sw."nameAr" ILIKE :search OR dw."nameEn" ILIKE :search OR dw."nameAr" ILIKE :search OR sm.notes ILIKE :search)`;
      replacements.search = `%${search}%`;
    }

    const [rows] = await sequelize.query(
      `SELECT sm.id,
              sm."productId",
              sm."warehouseId" as "sourceWarehouseId",
              dest."warehouseId" as "destinationWarehouseId",
              ABS(sm.quantity) as quantity,
              sm."unitCost",
              sm."totalCost",
              sm.notes,
              sm."createdAt",
              sm."createdBy",
              sm."fromLocationId",
              sm."toLocationId",
              sm."productVariantId",
              sm."lotNumber",
              sm."serialNumber",
              sm."expiryDate",
              p."nameEn" as "productNameEn",
              p."nameAr" as "productNameAr",
              p.sku as "productSku",
              sw."nameEn" as "sourceWarehouseNameEn",
              sw."nameAr" as "sourceWarehouseNameAr",
              dw."nameEn" as "destinationWarehouseNameEn",
              dw."nameAr" as "destinationWarehouseNameAr",
              fl."nameEn" as "fromLocationNameEn",
              tl."nameEn" as "toLocationNameEn"
       FROM stock_movements sm
       JOIN stock_movements dest ON dest."referenceId" = sm.id
            AND dest."movementType" = :movementType
            AND dest.quantity > 0
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses sw ON sw.id = sm."warehouseId"
       JOIN warehouses dw ON dw.id = dest."warehouseId"
       LEFT JOIN stock_locations fl ON fl.id = sm."fromLocationId"
       LEFT JOIN stock_locations tl ON tl.id = sm."toLocationId"
       WHERE sm."tenantId" = :tenantId
         AND sm."movementType" = :movementType
         AND sm.quantity < 0
         ${searchClause}
       ORDER BY sm."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_movements sm
       JOIN stock_movements dest ON dest."referenceId" = sm.id
            AND dest."movementType" = :movementType
            AND dest.quantity > 0
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses sw ON sw.id = sm."warehouseId"
       JOIN warehouses dw ON dw.id = dest."warehouseId"
       WHERE sm."tenantId" = :tenantId
         AND sm."movementType" = :movementType
         AND sm.quantity < 0
         ${searchClause}`,
      { replacements },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async getTransfersSummary(tenantId: string, movementType: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         COUNT(*) AS "totalTransfers",
         COUNT(*) FILTER (WHERE sm."createdAt" >= date_trunc('month', CURRENT_DATE)) AS "thisMonth",
         COALESCE(SUM(ABS(sm.quantity)), 0) AS "totalUnits"
       FROM stock_movements sm
       WHERE sm."tenantId" = :tenantId
         AND sm."movementType" = :movementType
         AND sm.quantity < 0`,
      {
        replacements: { tenantId, movementType },
      },
    );
    const row = (rows as unknown as any[])[0] ?? {};
    return {
      totalTransfers: parseInt(row.totalTransfers ?? '0', 10),
      thisMonth: parseInt(row.thisMonth ?? '0', 10),
      totalUnits: parseInt(row.totalUnits ?? '0', 10),
    };
  }

  async getTransaction(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    return sequelize.transaction();
  }
}
