import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { JournalLine } from '../entities/journal-line.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class JournalLinesRepository extends BaseRepository<JournalLine> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(JournalLine, false);
  }

  async findByEntryId(journalEntryId: string, transaction?: Transaction): Promise<JournalLine[]> {
    return this.findAllRaw({
      where: { entryId: journalEntryId } as any,
      bypassTenantScope: true,
      transaction,
    });
  }

  async deleteByEntryId(journalEntryId: string, transaction?: Transaction): Promise<void> {
    await this.rawQuery(
      `DELETE FROM journal_lines WHERE "entryId" = :journalEntryId`,
      { journalEntryId },
      transaction,
    );
  }

  async bulkInsertLines(
    journalEntryId: string,
    lines: Array<{
      accountId: string;
      costCenterId?: string | null;
      debit: number;
      credit: number;
      description?: string | null;
      currencyCode: string;
      exchangeRate: number;
    }>,
    transaction?: Transaction,
  ): Promise<void> {
    if (lines.length === 0) return;

    const values = lines
      .map(
        (_, i) =>
          `(:entryId_${i}, :accountId_${i}, :costCenterId_${i}, :debit_${i}, :credit_${i}, :description_${i}, :currency_${i}, :exchangeRate_${i}, NOW())`,
      )
      .join(', ');

    const replacements: Record<string, unknown> = {};
    lines.forEach((line, i) => {
      replacements[`entryId_${i}`] = journalEntryId;
      replacements[`accountId_${i}`] = line.accountId;
      replacements[`costCenterId_${i}`] = line.costCenterId ?? null;
      replacements[`debit_${i}`] = line.debit;
      replacements[`credit_${i}`] = line.credit;
      replacements[`description_${i}`] = line.description ?? null;
      replacements[`currency_${i}`] = line.currencyCode;
      replacements[`exchangeRate_${i}`] = line.exchangeRate;
    });

    await this.rawQuery(
      `INSERT INTO journal_lines ("entryId", "accountId", "costCenterId", debit, credit, description, currency, "exchangeRate", "createdAt")
       VALUES ${values}`,
      replacements,
      transaction,
    );
  }
}
