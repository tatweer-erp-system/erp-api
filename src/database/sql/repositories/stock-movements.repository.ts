import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StockMovementsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantId: string, options: { limit: number; offset: number; sortOrder: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, sortOrder } = options;

    const [rows] = await sequelize.query(
      `SELECT sm.*, p."nameEn" as "productName", w."nameEn" as "warehouseName"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses w ON w.id = sm."warehouseId"
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
      `SELECT sm.*, p."nameEn" as "productName", w."nameEn" as "warehouseName"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses w ON w.id = sm."warehouseId"
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
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO stock_movements (id, "tenantId", "productId", "warehouseId", "movementType", quantity, "quantityBefore", "quantityAfter", notes, "referenceId", "referenceType", "createdBy", "unitCost", "totalCost", "currencyId", "lotNumber", "serialNumber", "expiryDate", "branchId", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :warehouseId, :movementType, :quantity, :quantityBefore, :quantityAfter, :notes, :referenceId, :referenceType, :createdBy, :unitCost, :totalCost, :currencyId, :lotNumber, :serialNumber, :expiryDate, :branchId, NOW(), NOW())`,
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
      `SELECT sm.*, w."nameEn" as "warehouseName"
       FROM stock_movements sm
       JOIN warehouses w ON w.id = sm."warehouseId"
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
      `SELECT sm.*, p."nameEn" as "productName"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       WHERE sm."warehouseId" = :warehouseId AND sm."tenantId" = :tenantId
       ORDER BY sm."createdAt" DESC LIMIT :limit OFFSET :offset`,
      { replacements: { warehouseId, tenantId, limit, offset } },
    );
    return rows;
  }

  async getTransaction(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    return sequelize.transaction();
  }
}
