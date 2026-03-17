import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ReceiptsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAllPaginated(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder: string;
      status?: string;
      purchaseOrderId?: string;
      partnerId?: string;
      branchId?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder, status, purchaseOrderId, partnerId, branchId } =
      options;

    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit, offset };

    if (search) {
      whereClause += ` AND (r.reference ILIKE :search OR p."nameEn" ILIKE :search OR p."nameAr" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (status) {
      whereClause += ` AND r.status = :status`;
      replacements.status = status;
    }
    if (purchaseOrderId) {
      whereClause += ` AND r."purchaseOrderId" = :purchaseOrderId`;
      replacements.purchaseOrderId = purchaseOrderId;
    }
    if (partnerId) {
      whereClause += ` AND r."partnerId" = :partnerId`;
      replacements.partnerId = partnerId;
    }
    if (branchId) {
      whereClause += ` AND r."branchId" = :branchId`;
      replacements.branchId = branchId;
    }

    const [rows] = await sequelize.query(
      `SELECT r.*, p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr"
       FROM receipts r
       LEFT JOIN partners p ON p.id = r."partnerId" AND p."deletedAt" IS NULL
       WHERE r."deletedAt" IS NULL AND r."tenantId" = :tenantId ${whereClause}
       ORDER BY r."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total
       FROM receipts r
       LEFT JOIN partners p ON p.id = r."partnerId" AND p."deletedAt" IS NULL
       WHERE r."deletedAt" IS NULL AND r."tenantId" = :tenantId ${whereClause}`,
      { replacements } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT r.*, p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr"
       FROM receipts r
       LEFT JOIN partners p ON p.id = r."partnerId" AND p."deletedAt" IS NULL
       WHERE r.id = :id AND r."deletedAt" IS NULL AND r."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findOneWithLines(tenantId: string, id: string) {
    const receipt = await this.findOneById(tenantId, id);
    if (!receipt) return null;

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [lines] = await sequelize.query(
      `SELECT rl.*, pr."nameEn" as "productNameEn", pr."nameAr" as "productNameAr", pr.sku
       FROM receipt_lines rl
       LEFT JOIN products pr ON pr.id = rl."productId" AND pr."deletedAt" IS NULL
       WHERE rl."receiptId" = :id AND rl."deletedAt" IS NULL AND rl."tenantId" = :tenantId
       ORDER BY rl."createdAt" ASC`,
      { replacements: { id, tenantId } },
    );
    receipt.lines = lines;
    return receipt;
  }

  async insertReceipt(
    tenantId: string,
    data: {
      branchId: string;
      reference?: string | null;
      purchaseOrderId?: string | null;
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
      `INSERT INTO receipts (id, "tenantId", "branchId", reference, "purchaseOrderId", "partnerId", status, "scheduledDate", "responsibleId", notes, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :branchId, :reference, :purchaseOrderId, :partnerId, :status, :scheduledDate, :responsibleId, :notes, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          branchId: data.branchId,
          reference: data.reference ?? null,
          purchaseOrderId: data.purchaseOrderId ?? null,
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

  async updateReceipt(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
    transaction?: any,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE receipts SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { ...replacements, id, tenantId }, transaction } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE receipts SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }

  async getTransaction() {
    return this.tenantSequelizeService.getSharedSequelize().transaction();
  }
}
