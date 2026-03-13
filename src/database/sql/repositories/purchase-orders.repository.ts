import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PurchaseOrdersRepository extends BaseRepository<PurchaseOrder> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(PurchaseOrder, true);
  }

  // ── Raw SQL tenant-aware methods ──────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search ? `AND ("orderNumber" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM purchase_orders WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM purchase_orders WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
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
      vendorId: string;
      subtotal: number;
      taxAmount: number;
      totalAmount: number;
      currency: string;
      status: string;
      expectedDeliveryDate?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO purchase_orders (id, "tenantId", "orderNumber", "vendorId", subtotal, "taxAmount", "totalAmount", currency, status, "expectedDeliveryDate", notes, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :orderNumber, :vendorId, :subtotal, :taxAmount, :totalAmount, :currency, :status, :expectedDeliveryDate, :notes, :createdBy, :createdBy, 1, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          orderNumber: data.orderNumber,
          vendorId: data.vendorId,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          currency: data.currency,
          status: data.status,
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
