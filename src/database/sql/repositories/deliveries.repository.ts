import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class DeliveriesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAllPaginated(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder: string;
      status?: string;
      saleOrderId?: string;
      partnerId?: string;
      branchId?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder, status, saleOrderId, partnerId, branchId } = options;

    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit, offset };

    if (search) {
      whereClause += ` AND (d.reference ILIKE :search OR p."nameEn" ILIKE :search OR p."nameAr" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (status) {
      whereClause += ` AND d.status = :status`;
      replacements.status = status;
    }
    if (saleOrderId) {
      whereClause += ` AND d."saleOrderId" = :saleOrderId`;
      replacements.saleOrderId = saleOrderId;
    }
    if (partnerId) {
      whereClause += ` AND d."partnerId" = :partnerId`;
      replacements.partnerId = partnerId;
    }
    if (branchId) {
      whereClause += ` AND d."branchId" = :branchId`;
      replacements.branchId = branchId;
    }

    const [rows] = await sequelize.query(
      `SELECT d.*, p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr"
       FROM deliveries d
       LEFT JOIN partners p ON p.id = d."partnerId" AND p."deletedAt" IS NULL
       WHERE d."deletedAt" IS NULL AND d."tenantId" = :tenantId ${whereClause}
       ORDER BY d."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total
       FROM deliveries d
       LEFT JOIN partners p ON p.id = d."partnerId" AND p."deletedAt" IS NULL
       WHERE d."deletedAt" IS NULL AND d."tenantId" = :tenantId ${whereClause}`,
      { replacements } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT d.*, p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr"
       FROM deliveries d
       LEFT JOIN partners p ON p.id = d."partnerId" AND p."deletedAt" IS NULL
       WHERE d.id = :id AND d."deletedAt" IS NULL AND d."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findOneWithLines(tenantId: string, id: string) {
    const delivery = await this.findOneById(tenantId, id);
    if (!delivery) return null;

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [lines] = await sequelize.query(
      `SELECT dl.*, pr."nameEn" as "productNameEn", pr."nameAr" as "productNameAr", pr.sku
       FROM delivery_lines dl
       LEFT JOIN products pr ON pr.id = dl."productId" AND pr."deletedAt" IS NULL
       WHERE dl."deliveryId" = :id AND dl."deletedAt" IS NULL AND dl."tenantId" = :tenantId
       ORDER BY dl."createdAt" ASC`,
      { replacements: { id, tenantId } },
    );
    delivery.lines = lines;
    return delivery;
  }

  async insertDelivery(
    tenantId: string,
    data: {
      branchId: string;
      reference?: string | null;
      saleOrderId?: string | null;
      partnerId: string;
      status?: string;
      scheduledDate?: string | null;
      responsibleId?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
    transaction?: any,
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO deliveries (id, "tenantId", "branchId", reference, "saleOrderId", "partnerId", status, "scheduledDate", "responsibleId", notes, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :branchId, :reference, :saleOrderId, :partnerId, :status, :scheduledDate, :responsibleId, :notes, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          branchId: data.branchId,
          reference: data.reference ?? null,
          saleOrderId: data.saleOrderId ?? null,
          partnerId: data.partnerId,
          status: data.status ?? 'draft',
          scheduledDate: data.scheduledDate ?? null,
          responsibleId: data.responsibleId ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? null,
        },
        transaction,
      } as any,
    );
    return id;
  }

  async updateDelivery(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
    transaction?: any,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE deliveries SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { ...replacements, id, tenantId }, transaction } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE deliveries SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async getSummary(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         COUNT(*) AS "totalRecords",
         COUNT(*) FILTER (WHERE status = 'draft') AS "totalDraft",
         COUNT(*) FILTER (WHERE status = 'ready') AS "totalReady",
         COUNT(*) FILTER (WHERE status = 'done') AS "totalDone",
         COUNT(*) FILTER (WHERE status = 'cancelled') AS "totalCancelled"
       FROM deliveries
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } } as any,
    );
    const row = (rows as unknown as any[])[0] ?? {};
    return {
      totalRecords: parseInt(row.totalRecords ?? '0', 10),
      totalDraft: parseInt(row.totalDraft ?? '0', 10),
      totalReady: parseInt(row.totalReady ?? '0', 10),
      totalDone: parseInt(row.totalDone ?? '0', 10),
      totalCancelled: parseInt(row.totalCancelled ?? '0', 10),
    };
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }

  async getTransaction() {
    return this.tenantSequelizeService.getSharedSequelize().transaction();
  }
}
