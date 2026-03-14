import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Project } from '../entities/project.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ProjectsRepository extends BaseRepository<Project> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Project, true);
  }

  // ── Raw SQL tenant-aware methods ─────────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [rows] = await sequelize.query(
      `SELECT * FROM projects WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "createdAt" ${order} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM projects WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM projects WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertProject(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      status: string;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | null;
      managerId?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO projects (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", status, "startDate", "endDate", budget, "managerId", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :nameEn, :nameAr, :descriptionEn, :descriptionAr, :status, :startDate, :endDate, :budget, :managerId, :createdBy, :createdBy, 1, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          descriptionEn: data.descriptionEn ?? null,
          descriptionAr: data.descriptionAr ?? null,
          status: data.status,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          budget: data.budget ?? null,
          managerId: data.managerId ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateProject(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteProject(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE projects SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", status FROM projects WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
