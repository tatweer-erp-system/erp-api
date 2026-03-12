import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { Tenant } from '../entities/tenant.entity';
import { TenantStatus } from '../../../common/enums/status.enum';

export interface TenantDropdownRow {
  id: string;
  name: string;
  code: string;
}

@Injectable()
export class TenantsRepository extends BaseRepository<Tenant> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Tenant);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.findOne({ where: { slug } });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return this.exists({ slug });
  }

  async findByStatus(status: TenantStatus): Promise<Tenant[]> {
    return this.findAllRaw({ where: { status } });
  }

  async getDropdown(
    options: {
      search?: string;
      limit?: number;
    } = {},
  ): Promise<TenantDropdownRow[]> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    const limit = options.limit ?? 50;
    const searchClause = options.search ? `AND name ILIKE :search` : '';

    const [rows] = await shared.query(
      `SELECT id, name, slug as code
       FROM public.tenants
       WHERE deleted_at IS NULL AND status IN ('active', 'trial')
       ${searchClause}
       ORDER BY name ASC
       LIMIT :limit`,
      {
        replacements: {
          limit,
          ...(options.search ? { search: `%${options.search}%` } : {}),
        },
      },
    );

    return rows as TenantDropdownRow[];
  }
}
