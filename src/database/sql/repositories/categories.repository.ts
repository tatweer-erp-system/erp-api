import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantId: string, options: { limit: number; offset: number; search?: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search } = options;

    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM product_categories WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM product_categories WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM product_categories WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      descriptionEn: string | null;
      descriptionAr: string | null;
      parentId: string | null;
      createdBy: string | null;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO product_categories (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", "parentId", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :nameEn, :nameAr, :descriptionEn, :descriptionAr, :parentId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: { id, tenantId, ...data },
      } as any,
    );
    return id;
  }

  async update(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_categories SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, id, tenantId },
      } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_categories SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findForDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", "parentId" FROM product_categories WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
