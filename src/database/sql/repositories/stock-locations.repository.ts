import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class StockLocationsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAllPaginated(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder: string;
      warehouseId?: string;
      locationType?: string;
      isActive?: boolean;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder, warehouseId, locationType, isActive } = options;

    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit, offset };

    if (search) {
      whereClause += ` AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search OR "fullName" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (warehouseId) {
      whereClause += ` AND "warehouseId" = :warehouseId`;
      replacements.warehouseId = warehouseId;
    }
    if (locationType) {
      whereClause += ` AND "locationType" = :locationType`;
      replacements.locationType = locationType;
    }
    if (isActive !== undefined) {
      whereClause += ` AND "isActive" = :isActive`;
      replacements.isActive = isActive;
    }

    const [rows] = await sequelize.query(
      `SELECT * FROM stock_locations WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_locations WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM stock_locations WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertStockLocation(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      fullName?: string | null;
      warehouseId?: string | null;
      parentId?: string | null;
      locationType?: string;
      isScrap?: boolean;
      isReturn?: boolean;
      isActive?: boolean;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO stock_locations (id, "tenantId", "warehouseId", "nameEn", "nameAr", "fullName", "parentId", "locationType", "isScrap", "isReturn", "isActive", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :warehouseId, :nameEn, :nameAr, :fullName, :parentId, :locationType, :isScrap, :isReturn, :isActive, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          warehouseId: data.warehouseId ?? null,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          fullName: data.fullName ?? null,
          parentId: data.parentId ?? null,
          locationType: data.locationType ?? 'internal',
          isScrap: data.isScrap ?? false,
          isReturn: data.isReturn ?? false,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateStockLocation(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE stock_locations SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { ...replacements, id, tenantId } } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE stock_locations SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findDropdown(
    tenantId: string,
    options: { search?: string; limit: number; warehouseId?: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit, warehouseId } = options;
    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit };

    if (search) {
      whereClause += ` AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (warehouseId) {
      whereClause += ` AND "warehouseId" = :warehouseId`;
      replacements.warehouseId = warehouseId;
    }

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", "fullName", "locationType", "warehouseId" FROM stock_locations WHERE "isActive" = true AND "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
      { replacements } as any,
    );
    return rows;
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }
}
