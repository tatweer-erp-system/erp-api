import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SalesOrder } from '../entities/sales-order.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';

@Injectable()
export class SalesOrdersRepository extends BaseRepository<SalesOrder> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SalesOrder, true);
  }

  async getNextInvoiceCounter(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [result] = await sequelize.query(
      `SELECT COALESCE(MAX("zatcaInvoiceCounter"), 0) + 1 as "nextCounter" FROM sales_orders WHERE "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );
    return parseInt((result as unknown as any[])[0]?.nextCounter ?? '1', 10);
  }

  // ── Raw SQL data-access methods ─────────────────────────────────────────────

  async getSequelizeInstance(tenantId: string) {
    return this.tenantSequelizeService.getSharedSequelize();
  }

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search
      ? `AND (so."orderNumber" ILIKE :search OR c."firstName" ILIKE :search OR c."lastName" ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT so.*, c."firstName" as "contactFirstName", c."lastName" as "contactLastName"
       FROM sales_orders so
       LEFT JOIN contacts c ON c.id = so."contactId"
       WHERE so."deletedAt" IS NULL AND so."tenantId" = :tenantId ${whereClause}
       ORDER BY so."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM sales_orders so
       LEFT JOIN contacts c ON c.id = so."contactId"
       WHERE so."deletedAt" IS NULL AND so."tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT so.*, c."firstName" as "contactFirstName", c."lastName" as "contactLastName"
       FROM sales_orders so
       LEFT JOIN contacts c ON c.id = so."contactId"
       WHERE so.id = :id AND so."deletedAt" IS NULL AND so."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findOriginalInvoice(
    tenantId: string,
    id: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [origRows] = await sequelize.query(
      `SELECT id FROM sales_orders WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId }, transaction } as any,
    );
    return (origRows as unknown as any[]).length > 0;
  }

  async getNextInvoiceCounterWithTransaction(
    tenantId: string,
    transaction: Transaction,
  ): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [counterResult] = await sequelize.query(
      `SELECT COALESCE(MAX("zatcaInvoiceCounter"), 0) + 1 as "nextCounter" FROM sales_orders WHERE "tenantId" = :tenantId`,
      { replacements: { tenantId }, transaction } as any,
    );
    return parseInt((counterResult as unknown as any[])[0]?.nextCounter ?? '1', 10);
  }

  async insertOrder(
    tenantId: string,
    data: {
      id: string;
      orderNumber: string;
      contactId: string;
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      totalAmount: number;
      notes?: string | null;
      invoiceType: string;
      transactionType: string;
      supplyType: string;
      taxCategory: string;
      taxExemptionCode?: string | null;
      taxExemptionReason?: string | null;
      originalInvoiceId?: string | null;
      zatcaUUID: string;
      zatcaInvoiceCounter: number;
      createdBy?: string | null;
    },
    transaction: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO sales_orders (
        id, "tenantId", "orderNumber", "contactId", subtotal, "discountAmount", "taxAmount", "totalAmount",
        currency, status, notes, "invoiceType", "transactionType", "supplyType",
        "taxCategory", "taxExemptionCode", "taxExemptionReason", "originalInvoiceId",
        "zatcaUUID", "zatcaInvoiceCounter", "zatcaStatus",
        "createdBy", "updatedBy", "createdAt", "updatedAt"
      ) VALUES (
        :id, :tenantId, :orderNumber, :contactId, :subtotal, :discountAmount, :taxAmount, :totalAmount,
        'SAR', 'draft', :notes, :invoiceType, :transactionType, :supplyType,
        :taxCategory, :taxExemptionCode, :taxExemptionReason, :originalInvoiceId,
        :zatcaUUID, :zatcaInvoiceCounter, 'pending',
        :createdBy, :createdBy, NOW(), NOW()
      )`,
      {
        replacements: {
          id: data.id,
          tenantId,
          orderNumber: data.orderNumber,
          contactId: data.contactId,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          notes: data.notes ?? null,
          invoiceType: data.invoiceType,
          transactionType: data.transactionType,
          supplyType: data.supplyType,
          taxCategory: data.taxCategory,
          taxExemptionCode: data.taxExemptionCode ?? null,
          taxExemptionReason: data.taxExemptionReason ?? null,
          originalInvoiceId: data.originalInvoiceId ?? null,
          zatcaUUID: data.zatcaUUID,
          zatcaInvoiceCounter: data.zatcaInvoiceCounter,
          createdBy: data.createdBy ?? null,
        },
        transaction,
      } as any,
    );
  }

  async updateOrder(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
    transaction?: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE sales_orders SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
        transaction,
      } as any,
    );
  }

  async softDeleteOrder(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE sales_orders SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async updateStatus(
    tenantId: string,
    id: string,
    data: { status: string; updatedBy?: string | null },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE sales_orders SET status = :status, "updatedBy" = :updatedBy, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: {
          id,
          tenantId,
          status: data.status,
          updatedBy: data.updatedBy ?? null,
        },
      } as any,
    );
  }
}
