import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const offset = (page - 1) * limit;

    const searchClause = query.search
      ? `AND (module ILIKE :search OR action ILIKE :search OR description ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, module, action, description, conditions, created_at
       FROM permissions WHERE deleted_at IS NULL ${searchClause}
       ORDER BY module ASC, action ASC
       LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          limit,
          offset,
          ...(query.search ? { search: `%${query.search}%` } : {}),
        },
      },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM permissions WHERE deleted_at IS NULL ${searchClause}`,
      {
        replacements: query.search ? { search: `%${query.search}%` } : {},
      },
    );

    const total = (countResult as any[])[0]?.total ?? 0;

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getByModule(tenantSlug: string, module: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [rows] = await sequelize.query(
      `SELECT id, module, action, description, conditions
       FROM permissions
       WHERE deleted_at IS NULL AND module = :module
       ORDER BY action ASC`,
      { replacements: { module } },
    );

    return rows;
  }
}
