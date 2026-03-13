import { Injectable, Logger } from '@nestjs/common';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly journalEntriesRepository: JournalEntriesRepository) {}

  async trialBalance(tenantId: string, from: string, to: string) {
    const rows = await this.journalEntriesRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
         coa.id,
         coa.code,
         coa.name,
         coa."type" as "accountType",
         COALESCE(SUM(jl.debit), 0) as "totalDebit",
         COALESCE(SUM(jl.credit), 0) as "totalCredit",
         COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_lines jl ON jl."accountId" = coa.id
       LEFT JOIN journal_entries je ON je.id = jl."entryId"
         AND je."isPosted" = true
         AND je."tenantId" = :tenantId
         AND je."date" BETWEEN :from AND :to
       WHERE coa."tenantId" = :tenantId AND coa."deletedAt" IS NULL
       GROUP BY coa.id, coa.code, coa.name, coa."type"
       HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
       ORDER BY coa.code`,
      { tenantId, from, to },
    );

    return { data: rows, from, to };
  }

  async generalLedger(tenantId: string, accountId: string, from: string, to: string) {
    const rows = await this.journalEntriesRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
         je."entryNumber",
         je."date" as "entryDate",
         je.description,
         jl.debit,
         jl.credit,
         SUM(jl.debit - jl.credit) OVER (ORDER BY je."date", je."entryNumber") as "runningBalance",
         jl.currency as "currencyCode",
         jl."exchangeRate"
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl."entryId"
       WHERE jl."accountId" = :accountId
         AND je."tenantId" = :tenantId
         AND je."isPosted" = true
         AND je."date" BETWEEN :from AND :to
       ORDER BY je."date", je."entryNumber"`,
      { accountId, tenantId, from, to },
    );

    return { data: rows, accountId, from, to };
  }

  async incomeStatement(tenantId: string, from: string, to: string, costCenterId?: string) {
    const costCenterClause = costCenterId ? `AND jl."costCenterId" = :costCenterId` : '';

    const rows = await this.journalEntriesRepository.rawQuery<
      { accountType: string; total: string }[]
    >(
      `SELECT
         coa."type" as "accountType",
         SUM(
           CASE WHEN coa."normalBalance" = 'credit' THEN jl.credit - jl.debit
                ELSE jl.debit - jl.credit END
         ) as total
       FROM journal_lines jl
       JOIN chart_of_accounts coa ON coa.id = jl."accountId"
       JOIN journal_entries je ON je.id = jl."entryId"
       WHERE je."tenantId" = :tenantId
         AND je."isPosted" = true
         AND je."date" BETWEEN :from AND :to
         AND (coa.code LIKE '4%' OR coa.code LIKE '5%' OR coa.code LIKE '6%')
         ${costCenterClause}
       GROUP BY coa."type"`,
      { tenantId, from, to, costCenterId: costCenterId ?? null },
    );

    let revenue = 0;
    let cogs = 0;
    let expenses = 0;

    for (const row of rows) {
      const total = parseFloat(String(row.total ?? 0));
      if (row.accountType === 'revenue') revenue += total;
      else if (row.accountType === 'expense') {
        // COGS vs operating expenses: 5xxx = COGS, 6xxx = opex (we distinguish by type only here)
        expenses += total;
      }
    }

    const grossProfit = revenue - cogs;
    const netIncome = revenue - expenses;

    return { revenue, cogs, grossProfit, expenses, netIncome, from, to };
  }

  async balanceSheet(tenantId: string, asOfDate: string) {
    const rows = await this.journalEntriesRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
         coa.id,
         coa.code,
         coa.name,
         coa."type" as "accountType",
         coa."normalBalance",
         COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_lines jl ON jl."accountId" = coa.id
       LEFT JOIN journal_entries je ON je.id = jl."entryId"
         AND je."isPosted" = true
         AND je."tenantId" = :tenantId
         AND je."date" <= :asOfDate
       WHERE coa."tenantId" = :tenantId AND coa."deletedAt" IS NULL
         AND coa."type" IN ('asset', 'liability', 'equity')
       GROUP BY coa.id, coa.code, coa.name, coa."type", coa."normalBalance"
       HAVING COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) <> 0
       ORDER BY coa.code`,
      { tenantId, asOfDate },
    );

    const assets = rows.filter((r) => r.accountType === 'asset');
    const liabilities = rows.filter((r) => r.accountType === 'liability');
    const equity = rows.filter((r) => r.accountType === 'equity');

    const totalAssets = assets.reduce((sum, r) => sum + parseFloat(String(r.balance ?? 0)), 0);
    const totalLiabilities = liabilities.reduce(
      (sum, r) => sum + parseFloat(String(r.balance ?? 0)) * -1,
      0,
    );
    const totalEquity = equity.reduce((sum, r) => sum + parseFloat(String(r.balance ?? 0)) * -1, 0);

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      asOfDate,
    };
  }

  async accountStatement(tenantId: string, accountId: string, from: string, to: string) {
    // Opening balance: sum of all posted entries before `from`
    const openingRows = await this.journalEntriesRepository.rawQuery<{ balance: string }[]>(
      `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl."entryId"
       WHERE jl."accountId" = :accountId
         AND je."tenantId" = :tenantId
         AND je."isPosted" = true
         AND je."date" < :from`,
      { accountId, tenantId, from },
    );

    const openingBalance = parseFloat(String(openingRows[0]?.balance ?? 0));

    // Period movements
    const movementRows = await this.journalEntriesRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
         je."entryNumber",
         je."date" as "entryDate",
         je.description,
         jl.debit,
         jl.credit
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl."entryId"
       WHERE jl."accountId" = :accountId
         AND je."tenantId" = :tenantId
         AND je."isPosted" = true
         AND je."date" BETWEEN :from AND :to
       ORDER BY je."date", je."entryNumber"`,
      { accountId, tenantId, from, to },
    );

    const periodDebit = movementRows.reduce((sum, r) => sum + parseFloat(String(r.debit ?? 0)), 0);
    const periodCredit = movementRows.reduce(
      (sum, r) => sum + parseFloat(String(r.credit ?? 0)),
      0,
    );
    const closingBalance = openingBalance + periodDebit - periodCredit;

    return {
      accountId,
      from,
      to,
      openingBalance,
      movements: movementRows,
      periodDebit,
      periodCredit,
      closingBalance,
    };
  }
}
