import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';
import {
  PurchaseOrderBillStatus,
  PurchaseOrderReceiptStatus,
} from '@/common/enums/purchasing.enums';

@Injectable()
export class PurchaseOrdersRepository extends BaseRepository<PurchaseOrder> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(PurchaseOrder, true);
  }

  // ── Raw SQL tenant-aware methods ──────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder: string;
      status?: string;
      partnerId?: string;
      /** @deprecated Use partnerId */
      vendorId?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder, status, partnerId, vendorId } = options;

    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit, offset };

    if (search) {
      whereClause += ` AND ("orderNumber" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (status) {
      whereClause += ` AND status = :status`;
      replacements.status = status;
    }
    if (partnerId) {
      whereClause += ` AND "partnerId" = :partnerId`;
      replacements.partnerId = partnerId;
    } else if (vendorId) {
      whereClause += ` AND "partnerId" = :vendorId`;
      replacements.vendorId = vendorId;
    }

    const [rows] = await sequelize.query(
      `SELECT * FROM purchase_orders WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM purchase_orders WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM purchase_orders WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertOrder(
    tenantId: string,
    data: {
      orderNumber: string;
      partnerId: string;
      branchId?: string | null;
      buyerId?: string | null;
      paymentTermId?: string | null;
      subtotal: number;
      taxAmount: number;
      totalAmount: number;
      currency: string;
      currencyId?: string | null;
      exchangeRate?: number;
      totalAmountBase?: number | null;
      discountAmount?: number;
      status: string;
      billStatus?: string;
      receiptStatus?: string;
      expectedDeliveryDate?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO purchase_orders (id, "tenantId", "orderNumber", "partnerId", "vendorId", "branchId", "buyerId", "paymentTermId", subtotal, "taxAmount", "totalAmount", currency, "currencyId", "exchangeRate", "totalAmountBase", "discountAmount", status, "billStatus", "receiptStatus", "expectedDeliveryDate", notes, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :orderNumber, :partnerId, :partnerId, :branchId, :buyerId, :paymentTermId, :subtotal, :taxAmount, :totalAmount, :currency, :currencyId, :exchangeRate, :totalAmountBase, :discountAmount, :status, :billStatus, :receiptStatus, :expectedDeliveryDate, :notes, :createdBy, :createdBy, 1, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          orderNumber: data.orderNumber,
          partnerId: data.partnerId,
          branchId: data.branchId ?? null,
          buyerId: data.buyerId ?? null,
          paymentTermId: data.paymentTermId ?? null,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          currency: data.currency,
          currencyId: data.currencyId ?? null,
          exchangeRate: data.exchangeRate ?? 1,
          totalAmountBase: data.totalAmountBase ?? null,
          discountAmount: data.discountAmount ?? 0,
          status: data.status,
          billStatus: data.billStatus ?? PurchaseOrderBillStatus.NOTHING,
          receiptStatus: data.receiptStatus ?? PurchaseOrderReceiptStatus.NOTHING,
          expectedDeliveryDate: data.expectedDeliveryDate ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateOrder(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE purchase_orders SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteOrder(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE purchase_orders SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }
}
