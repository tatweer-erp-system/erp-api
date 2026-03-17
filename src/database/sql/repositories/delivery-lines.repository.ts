import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class DeliveryLinesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByDeliveryId(tenantId: string, deliveryId: string, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT dl.*, pr."nameEn" as "productNameEn", pr."nameAr" as "productNameAr", pr.sku
       FROM delivery_lines dl
       LEFT JOIN products pr ON pr.id = dl."productId" AND pr."deletedAt" IS NULL
       WHERE dl."deliveryId" = :deliveryId AND dl."deletedAt" IS NULL AND dl."tenantId" = :tenantId
       ORDER BY dl."createdAt" ASC`,
      { replacements: { deliveryId, tenantId }, transaction } as any,
    );
    return rows as unknown as any[];
  }

  async insertLine(
    tenantId: string,
    data: {
      branchId: string;
      deliveryId: string;
      productId: string;
      saleOrderLineId?: string | null;
      stockMoveId?: string | null;
      productVariantId?: string | null;
      qtyDemand: number;
      qtyDone?: number;
      unitOfMeasureId?: string | null;
      locationId?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
      createdBy?: string | null;
    },
    transaction?: any,
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO delivery_lines (id, "tenantId", "branchId", "deliveryId", "productId", "saleOrderLineId", "stockMoveId", "productVariantId", "qtyDemand", "qtyDone", "unitOfMeasureId", "locationId", "lotNumber", "serialNumber", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :branchId, :deliveryId, :productId, :saleOrderLineId, :stockMoveId, :productVariantId, :qtyDemand, :qtyDone, :unitOfMeasureId, :locationId, :lotNumber, :serialNumber, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          branchId: data.branchId,
          deliveryId: data.deliveryId,
          productId: data.productId,
          saleOrderLineId: data.saleOrderLineId ?? null,
          stockMoveId: data.stockMoveId ?? null,
          productVariantId: data.productVariantId ?? null,
          qtyDemand: data.qtyDemand,
          qtyDone: data.qtyDone ?? 0,
          unitOfMeasureId: data.unitOfMeasureId ?? null,
          locationId: data.locationId ?? null,
          lotNumber: data.lotNumber ?? null,
          serialNumber: data.serialNumber ?? null,
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
      `UPDATE delivery_lines SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { ...replacements, id, tenantId }, transaction } as any,
    );
  }

  async deleteByDeliveryId(tenantId: string, deliveryId: string, transaction?: any): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE delivery_lines SET "deletedAt" = NOW() WHERE "deliveryId" = :deliveryId AND "tenantId" = :tenantId`,
      { replacements: { deliveryId, tenantId }, transaction } as any,
    );
  }
}
