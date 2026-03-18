import { Injectable } from '@nestjs/common';
import { validate as isUUID } from 'uuid';
import { BaseRepository } from '../base.repository';
import { SalesOrder } from '../entities/sales-order.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { Transaction } from 'sequelize';

@Injectable()
export class SalesOrdersRepository extends BaseRepository<SalesOrder> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SalesOrder, true);
  }

  async getSequelizeInstance(_tenantId: string) {
    return this.tenantSequelizeService.getSharedSequelize();
  }

  async findAllPaginated(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder: string;
      status?: string;
      partnerId?: string;
      branchId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder, status, partnerId, branchId, dateFrom, dateTo } =
      options;

    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit, offset };

    if (search) {
      whereClause += ` AND (so."orderNumber" ILIKE :search OR p."nameEn" ILIKE :search OR p."nameAr" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (status) {
      whereClause += ` AND so.status = :status`;
      replacements.status = status;
    }
    if (partnerId) {
      whereClause += ` AND so."partnerId" = :partnerId`;
      replacements.partnerId = partnerId;
    }
    if (branchId) {
      whereClause += ` AND so."branchId" = :branchId`;
      replacements.branchId = branchId;
    }
    if (dateFrom) {
      whereClause += ` AND so."createdAt" >= :dateFrom`;
      replacements.dateFrom = dateFrom;
    }
    if (dateTo) {
      whereClause += ` AND so."createdAt" <= :dateTo`;
      replacements.dateTo = dateTo;
    }

    const [rows] = await sequelize.query(
      `SELECT so.*,
              p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr",
              CONCAT(u."firstNameEn", ' ', u."lastNameEn") as "salespersonNameEn",
              CONCAT(u."firstNameAr", ' ', u."lastNameAr") as "salespersonNameAr",
              b."nameEn" as "branchNameEn", b."nameAr" as "branchNameAr",
              c.code as "currencyCode", c.symbol as "currencySymbol"
       FROM sales_orders so
       LEFT JOIN partners p ON p.id = so."partnerId"
       LEFT JOIN users u ON u.id = so."salespersonId"
       LEFT JOIN branches b ON b.id = so."branchId"
       LEFT JOIN currencies c ON c.id = so."currencyId"
       WHERE so."deletedAt" IS NULL AND so."tenantId" = :tenantId ${whereClause}
       ORDER BY so."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM sales_orders so
       LEFT JOIN partners p ON p.id = so."partnerId"
       WHERE so."deletedAt" IS NULL AND so."tenantId" = :tenantId ${whereClause}`,
      { replacements } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string, transaction?: Transaction) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT so.*,
              p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr",
              CONCAT(u."firstNameEn", ' ', u."lastNameEn") as "salespersonNameEn",
              CONCAT(u."firstNameAr", ' ', u."lastNameAr") as "salespersonNameAr",
              b."nameEn" as "branchNameEn", b."nameAr" as "branchNameAr",
              c.code as "currencyCode", c.symbol as "currencySymbol", c."nameEn" as "currencyNameEn",
              pt."nameEn" as "paymentTermNameEn", pt."nameAr" as "paymentTermNameAr",
              pl."nameEn" as "pricelistNameEn", pl."nameAr" as "pricelistNameAr",
              fp."nameEn" as "fiscalPositionNameEn", fp."nameAr" as "fiscalPositionNameAr",
              CONCAT(cu."firstNameEn", ' ', cu."lastNameEn") as "createdByNameEn",
              CONCAT(cu."firstNameAr", ' ', cu."lastNameAr") as "createdByNameAr"
       FROM sales_orders so
       LEFT JOIN partners p ON p.id = so."partnerId"
       LEFT JOIN users u ON u.id = so."salespersonId"
       LEFT JOIN branches b ON b.id = so."branchId"
       LEFT JOIN currencies c ON c.id = so."currencyId"
       LEFT JOIN payment_terms pt ON pt.id = so."paymentTermId"
       LEFT JOIN pricelists pl ON pl.id = so."pricelistId"
       LEFT JOIN fiscal_positions fp ON fp.id = so."fiscalPositionId"
       LEFT JOIN users cu ON cu.id = so."createdBy"
       WHERE ${isUUID(id) ? 'so.id = :id' : 'so."orderNumber" = :id'} AND so."deletedAt" IS NULL AND so."tenantId" = :tenantId`,
      { replacements: { id, tenantId }, transaction } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertOrder(
    tenantId: string,
    data: {
      id: string;
      orderNumber: string;
      partnerId: string | null;
      branchId: string | null;
      pricelistId: string | null;
      paymentTermId: string | null;
      salespersonId: string | null;
      fiscalPositionId: string | null;
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      totalAmount: number;
      currencyId: string | null;
      exchangeRate: number;
      totalAmountBase: number | null;
      discountType: string | null;
      discountValue: number | null;
      notes?: string | null;
      createdBy?: string | null;
    },
    transaction: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO sales_orders (
        id, "tenantId", "orderNumber", "partnerId", "branchId",
        "pricelistId", "paymentTermId", "salespersonId", "fiscalPositionId",
        subtotal, "discountAmount", "taxAmount", "totalAmount",
        "currencyId", "exchangeRate", "totalAmountBase",
        "discountType", "discountValue",
        status, "invoiceStatus", "deliveryStatus",
        notes, "createdBy", "updatedBy", version, "createdAt", "updatedAt"
      ) VALUES (
        :id, :tenantId, :orderNumber, :partnerId, :branchId,
        :pricelistId, :paymentTermId, :salespersonId, :fiscalPositionId,
        :subtotal, :discountAmount, :taxAmount, :totalAmount,
        :currencyId, :exchangeRate, :totalAmountBase,
        :discountType, :discountValue,
        'draft', 'nothing', 'pending',
        :notes, :createdBy, :createdBy, 0, NOW(), NOW()
      )`,
      {
        replacements: {
          id: data.id,
          tenantId,
          orderNumber: data.orderNumber,
          partnerId: data.partnerId,
          branchId: data.branchId,
          pricelistId: data.pricelistId,
          paymentTermId: data.paymentTermId,
          salespersonId: data.salespersonId,
          fiscalPositionId: data.fiscalPositionId,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          currencyId: data.currencyId,
          exchangeRate: data.exchangeRate,
          totalAmountBase: data.totalAmountBase,
          discountType: data.discountType,
          discountValue: data.discountValue,
          notes: data.notes ?? null,
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

  async hasLinkedInvoices(
    tenantId: string,
    saleOrderId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id FROM invoices WHERE "saleOrderId" = :saleOrderId AND "tenantId" = :tenantId AND "deletedAt" IS NULL AND status != 'cancelled' LIMIT 1`,
      { replacements: { saleOrderId, tenantId }, transaction } as any,
    );
    return (rows as unknown as any[]).length > 0;
  }

  async hasLinkedDeliveries(
    tenantId: string,
    saleOrderId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id FROM deliveries WHERE "saleOrderId" = :saleOrderId AND "tenantId" = :tenantId AND "deletedAt" IS NULL AND status != 'cancelled' LIMIT 1`,
      { replacements: { saleOrderId, tenantId }, transaction } as any,
    );
    return (rows as unknown as any[]).length > 0;
  }

  async countLinkedInvoices(
    tenantId: string,
    saleOrderId: string,
    transaction?: Transaction,
  ): Promise<{ total: number; posted: number }> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'posted') as posted
       FROM invoices
       WHERE "saleOrderId" = :saleOrderId AND "tenantId" = :tenantId AND "deletedAt" IS NULL AND status != 'cancelled'`,
      { replacements: { saleOrderId, tenantId }, transaction } as any,
    );
    const row = (rows as unknown as any[])[0];
    return {
      total: parseInt(row?.total ?? '0', 10),
      posted: parseInt(row?.posted ?? '0', 10),
    };
  }

  async countLinkedDeliveries(
    tenantId: string,
    saleOrderId: string,
    transaction?: Transaction,
  ): Promise<{ total: number; done: number }> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'done') as done
       FROM deliveries
       WHERE "saleOrderId" = :saleOrderId AND "tenantId" = :tenantId AND "deletedAt" IS NULL AND status != 'cancelled'`,
      { replacements: { saleOrderId, tenantId }, transaction } as any,
    );
    const row = (rows as unknown as any[])[0];
    return {
      total: parseInt(row?.total ?? '0', 10),
      done: parseInt(row?.done ?? '0', 10),
    };
  }

  async getSalesReportSummary(
    tenantId: string,
    options: { dateFrom?: string; dateTo?: string; branchId?: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const replacements: Record<string, unknown> = { tenantId };

    let dateFilter = '';
    if (options.dateFrom) {
      dateFilter += ` AND so."createdAt" >= :dateFrom`;
      replacements.dateFrom = options.dateFrom;
    }
    if (options.dateTo) {
      dateFilter += ` AND so."createdAt" <= :dateTo`;
      replacements.dateTo = options.dateTo;
    }
    if (options.branchId) {
      dateFilter += ` AND so."branchId" = :branchId`;
      replacements.branchId = options.branchId;
    }

    const [summaryRows] = await sequelize.query(
      `SELECT COUNT(*) as "totalOrders",
              COALESCE(SUM("totalAmount"), 0) as "totalAmount",
              ROUND(COALESCE(AVG("totalAmount"), 0), 2) as "avgOrderValue"
       FROM sales_orders so
       WHERE so."deletedAt" IS NULL AND so."tenantId" = :tenantId ${dateFilter}`,
      { replacements } as any,
    );

    const [byStatus] = await sequelize.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM("totalAmount"), 0) as total
       FROM sales_orders so
       WHERE so."deletedAt" IS NULL AND so."tenantId" = :tenantId ${dateFilter}
       GROUP BY status`,
      { replacements } as any,
    );

    const summary = (summaryRows as unknown as any[])[0] ?? {};
    return {
      totalOrders: parseInt(summary.totalOrders ?? '0', 10),
      totalAmount: parseFloat(summary.totalAmount ?? '0'),
      avgOrderValue: parseFloat(summary.avgOrderValue ?? '0'),
      byStatus,
    };
  }
}
