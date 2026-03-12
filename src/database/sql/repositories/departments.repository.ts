import { Injectable } from '@nestjs/common';
import { Sequelize, Op } from 'sequelize';
import { TenantAwareRepository } from '../base.repository';
import { Department } from '../entities/department.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DepartmentsRepository extends TenantAwareRepository<Department> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Department);
  }

  async findByName(name: string, tenantId: string): Promise<Department | null> {
    return this.findOne({
      where: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn('jsonb_extract_path_text', Sequelize.col('name'), 'en'),
            name,
          ),
          Sequelize.where(
            Sequelize.fn('jsonb_extract_path_text', Sequelize.col('name'), 'ar'),
            name,
          ),
        ],
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

    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM departments WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause} ORDER BY created_at ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM departments WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM departments WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertDepartment(
    tenantId: string,
    data: {
      name: { en: string; ar: string };
      description?: { en: string; ar: string } | null;
      parentId?: string | null;
      managerId?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO departments (id, tenant_id, name, description, parent_id, manager_id, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :tenantId, :name::jsonb, :description::jsonb, :parentId, :managerId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          name: JSON.stringify(data.name),
          description: data.description ? JSON.stringify(data.description) : null,
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
      `UPDATE departments SET ${updates.join(', ')} WHERE id = :id AND tenant_id = :tenantId`,
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
      `UPDATE departments SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id AND tenant_id = :tenantId`,
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
      `SELECT id, name FROM departments WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause} ORDER BY name->>'en' LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
