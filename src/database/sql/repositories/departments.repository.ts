import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { Department } from '../entities/department.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DepartmentsRepository extends BaseRepository<Department> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Department, true);
  }

  async findByName(name: string, tenantId: string): Promise<Department | null> {
    return this.findOne({
      where: {
        [Op.or]: [{ nameEn: name }, { nameAr: name }],
      },
      tenantId,
    });
  }

  async existsByName(name: string, tenantId: string): Promise<boolean> {
    const department = await this.findByName(name, tenantId);
    return department !== null;
  }

  // ── Raw SQL tenant-aware methods ──────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM departments WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "createdAt" ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM departments WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, ...(search ? { search: `%${search}%` } : {}) } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM departments WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertDepartment(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      parentId?: string | null;
      managerId?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO departments (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", "parentId", "managerId", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :nameEn, :nameAr, :descriptionEn, :descriptionAr, :parentId, :managerId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          descriptionEn: data.descriptionEn ?? null,
          descriptionAr: data.descriptionAr ?? null,
          parentId: data.parentId ?? null,
          managerId: data.managerId ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateDepartment(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE departments SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteDepartment(
    tenantId: string,
    id: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE departments SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr" FROM departments WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
