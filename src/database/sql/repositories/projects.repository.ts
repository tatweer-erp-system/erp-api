import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../base.repository';
import { Project } from '../entities/project.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ProjectsRepository extends TenantAwareRepository<Project> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Project);
  }

  // ── Raw SQL tenant-aware methods ─────────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search)`
      : '';

    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [rows] = await sequelize.query(
      `SELECT * FROM projects WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause} ORDER BY created_at ${order} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM projects WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM projects WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertProject(
    tenantId: string,
    data: {
      name: Record<string, string>;
      description?: Record<string, string> | null;
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
      `INSERT INTO projects (id, tenant_id, name, description, status, start_date, end_date, budget, manager_id, created_by, updated_by, version, created_at, updated_at)
       VALUES (:id, :tenantId, :name::jsonb, :description::jsonb, :status, :startDate, :endDate, :budget, :managerId, :createdBy, :createdBy, 1, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          name: JSON.stringify(data.name),
          description: data.description ? JSON.stringify(data.description) : null,
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
      `UPDATE projects SET ${updates.join(', ')} WHERE id = :id AND tenant_id = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteProject(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE projects SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, name, status FROM projects WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause} ORDER BY name->>'en' LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
