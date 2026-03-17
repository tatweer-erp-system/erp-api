import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { AccountGroup } from '../entities/account-group.entity';

@Injectable()
export class AccountGroupsRepository extends BaseRepository<AccountGroup> {
  constructor() {
    super(AccountGroup, true);
  }

  async existsByCodePrefix(tenantId: string, codePrefix: string): Promise<boolean> {
    return this.exists({ codePrefix }, { tenantId });
  }

  async getTree(tenantId: string): Promise<Record<string, unknown>[]> {
    return this.rawQuery<Record<string, unknown>[]>(
      `WITH RECURSIVE ag_tree AS (
        SELECT * FROM account_groups
        WHERE "parentId" IS NULL AND "tenantId" = :tenantId AND "deletedAt" IS NULL
        UNION ALL
        SELECT g.* FROM account_groups g
        INNER JOIN ag_tree t ON g."parentId" = t.id
        WHERE g."deletedAt" IS NULL
      )
      SELECT * FROM ag_tree ORDER BY "codePrefix"`,
      { tenantId },
    );
  }
}
