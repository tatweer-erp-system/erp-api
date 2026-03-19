import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class WarehousesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder?: string;
      isActive?: boolean;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder = 'ASC', isActive } = options;

    const searchClause = search
      ? `AND (w."nameEn" ILIKE :search OR w."nameAr" ILIKE :search OR w.location ILIKE :search OR w."descriptionEn" ILIKE :search OR w."descriptionAr" ILIKE :search OR b."nameEn" ILIKE :search OR b."nameAr" ILIKE :search)`
      : '';

    const activeClause = isActive !== undefined ? `AND w."isActive" = :isActive` : '';

    const replacements: Record<string, unknown> = {
      tenantId,
      limit,
      offset,
      search: search ? `%${search}%` : '',
    };
    if (isActive !== undefined) {
      replacements.isActive = isActive;
    }

    const [rows] = await sequelize.query(
      `SELECT w.*, b."nameEn" as "branchNameEn", b."nameAr" as "branchNameAr"
       FROM warehouses w
       LEFT JOIN branches b ON b.id = w."branchId"
       WHERE w."deletedAt" IS NULL AND w."tenantId" = :tenantId ${searchClause} ${activeClause}
       ORDER BY w."nameEn" ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}
       LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const { search: _search, limit: _limit, offset: _offset, ...countReplacements } = replacements;
    const countReps: Record<string, unknown> = { ...countReplacements, tenantId };
    if (search) countReps.search = `%${search}%`;

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total
       FROM warehouses w
       LEFT JOIN branches b ON b.id = w."branchId"
       WHERE w."deletedAt" IS NULL AND w."tenantId" = :tenantId ${searchClause} ${activeClause}`,
      { replacements: countReps },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM warehouses WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      location: string | null;
      createdBy: string | null;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO warehouses (id, "tenantId", "nameEn", "nameAr", location, "isActive", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :nameEn, :nameAr, :location, true, :createdBy, :createdBy, NOW(), NOW())`,
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
      `UPDATE warehouses SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, id, tenantId },
      } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE warehouses SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async getSummary(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         COUNT(*) AS "totalWarehouses",
         COUNT(*) FILTER (WHERE "isActive" = true) AS "totalActive",
         COUNT(*) FILTER (WHERE "isActive" = false) AS "totalInactive"
       FROM warehouses
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } } as any,
    );
    const row = (rows as unknown as any[])[0] ?? {};
    return {
      totalWarehouses: parseInt(row.totalWarehouses ?? '0', 10),
      totalActive: parseInt(row.totalActive ?? '0', 10),
      totalInactive: parseInt(row.totalInactive ?? '0', 10),
    };
  }

  async findDefault(tenantId: string): Promise<Record<string, unknown> | null> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM warehouses WHERE "tenantId" = :tenantId AND "isActive" = true AND "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1`,
      { replacements: { tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findForDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", location FROM warehouses WHERE "deletedAt" IS NULL AND "isActive" = true AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
