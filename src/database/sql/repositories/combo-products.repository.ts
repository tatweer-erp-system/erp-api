import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ComboProductsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantId: string, options: { limit: number; offset: number; search?: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search } = options;

    const whereClause = search ? `AND (p."nameEn" ILIKE :search OR p."nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT cp.*, p."nameEn", p."nameAr", p."unitPrice", p.sku
       FROM combo_products cp
       JOIN products p ON p.id = cp."productId" AND p."deletedAt" IS NULL
       WHERE cp."deletedAt" IS NULL AND cp."tenantId" = :tenantId ${whereClause}
       ORDER BY cp."createdAt" DESC LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total
       FROM combo_products cp
       JOIN products p ON p.id = cp."productId" AND p."deletedAt" IS NULL
       WHERE cp."deletedAt" IS NULL AND cp."tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT cp.*, p."nameEn", p."nameAr", p."unitPrice", p.sku
       FROM combo_products cp
       JOIN products p ON p.id = cp."productId"
       WHERE cp.id = :id AND cp."deletedAt" IS NULL AND cp."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findByProductId(tenantId: string, productId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM combo_products WHERE "productId" = :productId AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { productId, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: { productId: string; createdBy: string | null },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO combo_products (id, "tenantId", "productId", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: { id, tenantId, ...data },
        transaction,
      } as any,
    );
    return id;
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE combo_products SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async getTransaction() {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    return sequelize.transaction();
  }
}
