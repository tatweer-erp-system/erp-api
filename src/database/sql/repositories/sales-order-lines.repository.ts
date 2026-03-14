import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SalesOrderLine } from '../entities/sales-order-line.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { QueryOptions } from '../../../common/interfaces/repository.interface';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';

@Injectable()
export class SalesOrderLinesRepository extends BaseRepository<SalesOrderLine> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SalesOrderLine, true);
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
    options: QueryOptions = {},
  ): Promise<SalesOrderLine[]> {
    return this.findAllRaw({
      where: { orderId, ...options.where },
      transaction: options.transaction,
      tenantId,
    });
  }

  // ── Raw SQL data-access methods ─────────────────────────────────────────────

  async findLinesByOrderId(tenantId: string, orderId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [lines] = await sequelize.query(
      `SELECT sol.*, p."nameEn" as "productName", p.sku as "productSku"
       FROM sales_order_lines sol
       LEFT JOIN products p ON p.id = sol."productId"
       WHERE sol."orderId" = :id AND sol."tenantId" = :tenantId
       ORDER BY sol."createdAt"`,
      { replacements: { id: orderId, tenantId } },
    );
    return lines;
  }

  async deleteByOrderId(
    tenantId: string,
    orderId: string,
    transaction: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `DELETE FROM sales_order_lines WHERE "orderId" = :orderId AND "tenantId" = :tenantId`,
      {
        replacements: { orderId, tenantId },
        transaction,
      } as any,
    );
  }

  async insertLine(
    tenantId: string,
    data: {
      orderId: string;
      productId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
    },
    transaction: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO sales_order_lines (
        "tenantId", "orderId", "productId", description, quantity, "unitPrice",
        "discountAmount", "taxRate", "taxAmount", "lineTotal", "createdAt", "updatedAt"
      ) VALUES (
        :tenantId, :orderId, :productId, :description, :quantity, :unitPrice,
        :discountAmount, :taxRate, :taxAmount, :lineTotal, NOW(), NOW()
      )`,
      {
        replacements: {
          tenantId,
          orderId: data.orderId,
          productId: data.productId,
          description: data.description,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          discountAmount: data.discountAmount,
          taxRate: data.taxRate,
          taxAmount: data.taxAmount,
          lineTotal: data.lineTotal,
        },
        transaction,
      } as any,
    );
  }
}
