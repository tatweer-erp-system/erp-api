import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PurchaseOrderLine } from '../entities/purchase-order-line.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PurchaseOrderLinesRepository extends BaseRepository<PurchaseOrderLine> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(PurchaseOrderLine, true);
  }

  async findByOrderId(orderId: string, tenantId: string): Promise<PurchaseOrderLine[]> {
    return this.findAllRaw({
      where: { orderId },
      tenantId,
    });
  }

  // ── Raw SQL tenant-aware methods ──────────────────────────────────────────

  async findByOrderIdTenant(tenantId: string, orderId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM purchase_order_lines WHERE "orderId" = :orderId AND "tenantId" = :tenantId`,
      { replacements: { orderId, tenantId } },
    );
    return rows as unknown as any[];
  }

  async findOneByIdTenant(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM purchase_order_lines WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertLine(
    tenantId: string,
    data: {
      orderId: string;
      productId: string;
      productVariantId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      taxAmount: number;
      lineTotal: number;
      currencyId?: string | null;
      lineTotalBase?: number | null;
      discountAmount?: number;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO purchase_order_lines ("tenantId", "orderId", "productId", "productVariantId", description, quantity, "unitPrice", "taxAmount", "lineTotal", "currencyId", "lineTotalBase", "receivedQuantity", "qtyBilled", "discountAmount", "createdAt", "updatedAt")
       VALUES (:tenantId, :orderId, :productId, :productVariantId, :description, :quantity, :unitPrice, :taxAmount, :lineTotal, :currencyId, :lineTotalBase, 0, 0, :discountAmount, NOW(), NOW())`,
      {
        replacements: {
          tenantId,
          orderId: data.orderId,
          productId: data.productId,
          productVariantId: data.productVariantId ?? null,
          description: data.description,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          taxAmount: data.taxAmount,
          lineTotal: data.lineTotal,
          currencyId: data.currencyId ?? null,
          lineTotalBase: data.lineTotalBase ?? null,
          discountAmount: data.discountAmount ?? 0,
        },
      } as any,
    );
    return '';
  }

  async updateReceivedQuantity(
    tenantId: string,
    lineId: string,
    receivedQuantity: number,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE purchase_order_lines SET "receivedQuantity" = :receivedQuantity, "updatedAt" = NOW() WHERE id = :lineId AND "tenantId" = :tenantId`,
      { replacements: { lineId, tenantId, receivedQuantity } } as any,
    );
  }

  async updateQtyBilled(tenantId: string, lineId: string, qtyBilled: number): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE purchase_order_lines SET "qtyBilled" = :qtyBilled, "updatedAt" = NOW() WHERE id = :lineId AND "tenantId" = :tenantId`,
      { replacements: { lineId, tenantId, qtyBilled } } as any,
    );
  }

  async deleteByOrderId(tenantId: string, orderId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `DELETE FROM purchase_order_lines WHERE "orderId" = :orderId AND "tenantId" = :tenantId`,
      { replacements: { orderId, tenantId } } as any,
    );
  }
}
