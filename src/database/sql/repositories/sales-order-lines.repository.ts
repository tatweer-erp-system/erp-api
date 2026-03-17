import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SalesOrderLine } from '../entities/sales-order-line.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { Transaction } from 'sequelize';

@Injectable()
export class SalesOrderLinesRepository extends BaseRepository<SalesOrderLine> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SalesOrderLine, true);
  }

  async findLinesByOrderId(tenantId: string, orderId: string, transaction?: Transaction) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [lines] = await sequelize.query(
      `SELECT sol.*, p."nameEn" as "productNameEn", p."nameAr" as "productNameAr", p.sku as "productSku"
       FROM sales_order_lines sol
       LEFT JOIN products p ON p.id = sol."productId"
       WHERE sol."orderId" = :orderId AND sol."tenantId" = :tenantId AND sol."deletedAt" IS NULL
       ORDER BY sol.sequence, sol."createdAt"`,
      { replacements: { orderId, tenantId }, transaction } as any,
    );
    return lines as unknown as any[];
  }

  async deleteByOrderId(
    tenantId: string,
    orderId: string,
    transaction: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE sales_order_lines SET "deletedAt" = NOW() WHERE "orderId" = :orderId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: { orderId, tenantId },
        transaction,
      } as any,
    );
  }

  async insertLine(
    tenantId: string,
    data: {
      id: string;
      orderId: string;
      productId: string | null;
      productVariantId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      discountPct: number;
      discountAmount: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
      currencyId: string | null;
      lineTotalBase: number | null;
      sequence: number;
      createdBy: string | null;
    },
    transaction: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO sales_order_lines (
        id, "tenantId", "orderId", "productId", "productVariantId",
        description, quantity, "unitPrice", "discountPct", "discountAmount",
        "taxRate", "taxAmount", "lineTotal", "currencyId", "lineTotalBase",
        "qtyDelivered", "qtyInvoiced", sequence,
        "createdBy", "updatedBy", version, "createdAt", "updatedAt"
      ) VALUES (
        :id, :tenantId, :orderId, :productId, :productVariantId,
        :description, :quantity, :unitPrice, :discountPct, :discountAmount,
        :taxRate, :taxAmount, :lineTotal, :currencyId, :lineTotalBase,
        0, 0, :sequence,
        :createdBy, :createdBy, 0, NOW(), NOW()
      )`,
      {
        replacements: {
          id: data.id,
          tenantId,
          orderId: data.orderId,
          productId: data.productId,
          productVariantId: data.productVariantId,
          description: data.description,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          discountPct: data.discountPct,
          discountAmount: data.discountAmount,
          taxRate: data.taxRate,
          taxAmount: data.taxAmount,
          lineTotal: data.lineTotal,
          currencyId: data.currencyId,
          lineTotalBase: data.lineTotalBase,
          sequence: data.sequence,
          createdBy: data.createdBy,
        },
        transaction,
      } as any,
    );
  }

  async updateLine(
    tenantId: string,
    lineId: string,
    updates: string[],
    replacements: Record<string, unknown>,
    transaction?: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE sales_order_lines SET ${updates.join(', ')} WHERE id = :lineId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: { ...replacements, lineId, tenantId },
        transaction,
      } as any,
    );
  }

  async findLineById(tenantId: string, lineId: string, transaction?: Transaction) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM sales_order_lines WHERE id = :lineId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { lineId, tenantId }, transaction } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async softDeleteLine(
    tenantId: string,
    lineId: string,
    updatedBy: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE sales_order_lines SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :lineId AND "tenantId" = :tenantId`,
      { replacements: { lineId, tenantId, updatedBy }, transaction } as any,
    );
  }
}
