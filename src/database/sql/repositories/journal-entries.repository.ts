import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { JournalEntry } from '../entities/journal-entry.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class JournalEntriesRepository extends BaseRepository<JournalEntry> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(JournalEntry, true);
  }

  async findByIdWithLines(
    tenantId: string,
    id: string,
    transaction?: Transaction,
  ): Promise<Record<string, unknown> | null> {
    const rows = await this.rawQuery<Record<string, unknown>[]>(
      `SELECT je.*, je.date as "entryDate", je.type as "entryType",
         json_agg(
           json_build_object(
             'id', jl.id,
             'accountId', jl."accountId",
             'costCenterId', jl."costCenterId",
             'debit', jl.debit,
             'credit', jl.credit,
             'description', jl.description,
             'currency', jl.currency,
             'exchangeRate', jl."exchangeRate"
           ) ORDER BY jl.id
         ) FILTER (WHERE jl.id IS NOT NULL) as lines
       FROM journal_entries je
       LEFT JOIN journal_lines jl ON jl."entryId" = je.id
       WHERE je.id = :id AND je."tenantId" = :tenantId AND je."deletedAt" IS NULL
       GROUP BY je.id`,
      { id, tenantId },
      transaction,
    );
    return rows[0] ?? null;
  }

  async nextEntryNumber(tenantId: string, transaction?: Transaction): Promise<string> {
    const rows = await this.rawQuery<{ cnt: string }[]>(
      `SELECT COUNT(*) + 1 as cnt FROM journal_entries WHERE "tenantId" = :tenantId`,
      { tenantId },
      transaction,
    );
    const seq = parseInt(rows[0]?.cnt ?? '1', 10);
    return `JE-${String(seq).padStart(6, '0')}`;
  }
}
