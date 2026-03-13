import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { CostCenter } from '../entities/cost-center.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class CostCentersRepository extends BaseRepository<CostCenter> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(CostCenter, true);
  }

  async existsByCode(tenantId: string, code: string): Promise<boolean> {
    return this.exists({ code }, { tenantId });
  }

  async getTree(tenantId: string): Promise<Record<string, unknown>[]> {
    return this.rawQuery<Record<string, unknown>[]>(
      `WITH RECURSIVE cc_tree AS (
        SELECT * FROM cost_centers
        WHERE "parentId" IS NULL AND "tenantId" = :tenantId AND "deletedAt" IS NULL
        UNION ALL
        SELECT c.* FROM cost_centers c
        INNER JOIN cc_tree t ON c."parentId" = t.id
        WHERE c."deletedAt" IS NULL
      )
      SELECT * FROM cc_tree ORDER BY code`,
      { tenantId },
    );
  }
}
