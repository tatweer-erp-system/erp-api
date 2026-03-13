import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Permission } from '../entities/permission.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class PermissionsRepository extends BaseRepository<Permission> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Permission, true);
  }

  // ── Tenant-aware raw query methods ────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const offset = (options.page - 1) * options.limit;

    const searchClause = options.search
      ? `AND (module ILIKE :search OR action ILIKE :search OR description ILIKE :search)`
      : '';

    const replacements: Record<string, unknown> = {
      tenantId,
      limit: options.limit,
      offset,
      ...(options.search ? { search: `%${options.search}%` } : {}),
    };

    const [rows] = await sequelize.query(
      `SELECT id, module, action, description, conditions, created_at
       FROM permissions WHERE deleted_at IS NULL AND tenant_id = :tenantId ${searchClause}
       ORDER BY module ASC, action ASC
       LIMIT :limit OFFSET :offset`,
      { replacements },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM permissions WHERE deleted_at IS NULL AND tenant_id = :tenantId ${searchClause}`,
      {
        replacements: { tenantId, ...(options.search ? { search: `%${options.search}%` } : {}) },
      },
    );

    const total = (countResult as unknown as any[])[0]?.total ?? 0;

    return { rows, total };
  }

  async findByModule(tenantId: string, module: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT id, module, action, description, conditions
       FROM permissions
       WHERE deleted_at IS NULL AND module = :module AND tenant_id = :tenantId
       ORDER BY action ASC`,
      { replacements: { module, tenantId } },
    );

    return rows;
  }
}
