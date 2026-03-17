import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReceiptLinesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByReceiptId(tenantId: string, receiptId: string, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT rl.*, pr."nameEn" as "productNameEn", pr."nameAr" as "productNameAr", pr.sku
       FROM receipt_lines rl
       LEFT JOIN products pr ON pr.id = rl."productId" AND pr."deletedAt" IS NULL
       WHERE rl."receiptId" = :receiptId AND rl."deletedAt" IS NULL AND rl."tenantId" = :tenantId
       ORDER BY rl."createdAt" ASC`,
      { replacements: { receiptId, tenantId }, transaction } as any,
    );
    return rows as unknown as any[];
  }

  async insertLine(
    tenantId: string,
    data: {
      branchId: string;
      receiptId: string;
      productId: string;
      purchaseOrderLineId?: string | null;
      stockMoveId?: string | null;
      productVariantId?: string | null;
      qtyDemand: number;
      qtyDone?: number;
      unitOfMeasureId?: string | null;
      locationId?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
      expiryDate?: string | null;
      unitCost?: number;
      createdBy?: string | null;
    },
    transaction?: any,
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO receipt_lines (id, "tenantId", "branchId", "receiptId", "productId", "purchaseOrderLineId", "stockMoveId", "productVariantId", "qtyDemand", "qtyDone", "unitOfMeasureId", "locationId", "lotNumber", "serialNumber", "expiryDate", "unitCost", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :branchId, :receiptId, :productId, :purchaseOrderLineId, :stockMoveId, :productVariantId, :qtyDemand, :qtyDone, :unitOfMeasureId, :locationId, :lotNumber, :serialNumber, :expiryDate, :unitCost, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          branchId: data.branchId,
          receiptId: data.receiptId,
          productId: data.productId,
          purchaseOrderLineId: data.purchaseOrderLineId ?? null,
          stockMoveId: data.stockMoveId ?? null,
          productVariantId: data.productVariantId ?? null,
          qtyDemand: data.qtyDemand,
          qtyDone: data.qtyDone ?? 0,
          unitOfMeasureId: data.unitOfMeasureId ?? null,
          locationId: data.locationId ?? null,
          lotNumber: data.lotNumber ?? null,
          serialNumber: data.serialNumber ?? null,
          expiryDate: data.expiryDate ?? null,
          unitCost: data.unitCost ?? 0,
          createdBy: data.createdBy ?? null,
        },
        transaction,
      } as any,
    );
    return id;
  }

  async updateLine(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
    transaction?: any,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE receipt_lines SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { ...replacements, id, tenantId }, transaction } as any,
    );
  }

  async deleteByReceiptId(tenantId: string, receiptId: string, transaction?: any): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE receipt_lines SET "deletedAt" = NOW() WHERE "receiptId" = :receiptId AND "tenantId" = :tenantId`,
      { replacements: { receiptId, tenantId }, transaction } as any,
    );
  }
}
