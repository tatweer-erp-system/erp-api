import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { ChartOfAccount } from '../entities/chart-of-account.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class ChartOfAccountsRepository extends BaseRepository<ChartOfAccount> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(ChartOfAccount, true);
  }

  async findByCode(
    tenantId: string,
    code: string,
    transaction?: Transaction,
  ): Promise<ChartOfAccount | null> {
    return this.findOne({ where: { code }, tenantId, transaction });
  }

  async existsByCode(tenantId: string, code: string): Promise<boolean> {
    return this.exists({ code }, { tenantId });
  }

  async getTree(tenantId: string): Promise<Record<string, unknown>[]> {
    return this.rawQuery<Record<string, unknown>[]>(
      `WITH RECURSIVE coa_tree AS (
        SELECT * FROM chart_of_accounts
        WHERE "parentId" IS NULL AND "tenantId" = :tenantId AND "deletedAt" IS NULL
        UNION ALL
        SELECT c.* FROM chart_of_accounts c
        INNER JOIN coa_tree t ON c."parentId" = t.id
        WHERE c."deletedAt" IS NULL
      )
      SELECT * FROM coa_tree ORDER BY code`,
      { tenantId },
    );
  }

  async hasPostedLines(tenantId: string, accountId: string): Promise<boolean> {
    const rows = await this.rawQuery<{ cnt: string }[]>(
      `SELECT COUNT(*) as cnt
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl."entryId"
       WHERE jl."accountId" = :accountId AND je."tenantId" = :tenantId AND je."isPosted" = true`,
      { accountId, tenantId },
    );
    return parseInt(rows[0]?.cnt ?? '0', 10) > 0;
  }

  async hasUnpostedLines(tenantId: string, accountId: string): Promise<boolean> {
    const rows = await this.rawQuery<{ cnt: string }[]>(
      `SELECT COUNT(*) as cnt
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl."entryId"
       WHERE jl."accountId" = :accountId AND je."tenantId" = :tenantId AND je."isPosted" = false AND je."deletedAt" IS NULL`,
      { accountId, tenantId },
    );
    return parseInt(rows[0]?.cnt ?? '0', 10) > 0;
  }
}
