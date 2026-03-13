import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PurchaseOrderLine } from '../entities/purchase-order-line.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

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
      description: string;
      quantity: number;
      unitPrice: number;
      taxAmount: number;
      lineTotal: number;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO purchase_order_lines (id, "tenantId", "orderId", "productId", description, quantity, "unitPrice", "taxAmount", "lineTotal", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :orderId, :productId, :description, :quantity, :unitPrice, :taxAmount, :lineTotal, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          orderId: data.orderId,
          productId: data.productId,
          description: data.description,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          taxAmount: data.taxAmount,
          lineTotal: data.lineTotal,
        },
      } as any,
    );
    return id;
  }

  async deleteByOrderId(tenantId: string, orderId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `DELETE FROM purchase_order_lines WHERE "orderId" = :orderId AND "tenantId" = :tenantId`,
      { replacements: { orderId, tenantId } } as any,
    );
  }
}
