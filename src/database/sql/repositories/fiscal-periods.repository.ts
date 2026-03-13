import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { FiscalPeriod } from '../entities/fiscal-period.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class FiscalPeriodsRepository extends BaseRepository<FiscalPeriod> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(FiscalPeriod, false);
  }

  async findByTenant(tenantId: string): Promise<FiscalPeriod[]> {
    return this.findAllRaw({
      where: { tenantId },
      bypassTenantScope: true,
      order: [
        ['fiscalYear', 'DESC'],
        ['periodNumber', 'ASC'],
      ],
    });
  }

  async findByIdAndTenant(
    id: number,
    tenantId: string,
    transaction?: Transaction,
  ): Promise<FiscalPeriod | null> {
    return this.findOne({ where: { id, tenantId }, bypassTenantScope: true, transaction });
  }

  async findPeriodForDate(
    tenantId: string,
    date: string,
    transaction?: Transaction,
  ): Promise<FiscalPeriod | null> {
    const rows = await this.rawQuery<FiscalPeriod[]>(
      `SELECT * FROM fiscal_periods
       WHERE "tenantId" = :tenantId
         AND "startDate" <= :date
         AND "endDate" >= :date
       ORDER BY "startDate" DESC
       LIMIT 1`,
      { tenantId, date },
      transaction,
    );
    return rows[0] ?? null;
  }

  async getDraftEntryNumbers(
    tenantId: string,
    periodId: number,
    transaction?: Transaction,
  ): Promise<string[]> {
    const rows = await this.rawQuery<{ entryNumber: string }[]>(
      `SELECT "entryNumber" FROM journal_entries
       WHERE "tenantId" = :tenantId
         AND "periodId" = :periodId
         AND "isPosted" = false
         AND "deletedAt" IS NULL`,
      { tenantId, periodId },
      transaction,
    );
    return rows.map((r) => r.entryNumber);
  }
}
