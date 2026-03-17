import { Injectable, Logger } from '@nestjs/common';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';
import { AccountType, NormalBalance } from '@/common/enums/accounting.enums';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly journalEntriesRepository: JournalEntriesRepository) {}

  /**
   * Trial balance report.
   * Supports optional filtering by journal type and grouping by account_groups.
   */
  async trialBalance(
    tenantId: string,
    from: string,
    to: string,
    options?: { journalId?: string; groupByAccountGroup?: boolean },
  ) {
    const journalClause = options?.journalId ? `AND je."journalId" = :journalId` : '';

    const rows = await this.journalEntriesRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
         coa.id,
         coa.code,
         coa."nameEn",
         coa."nameAr",
         coa."type" as "accountType",
         coa."groupId",
         ag."nameEn" as "groupNameEn",
         ag."nameAr" as "groupNameAr",
         ag."codePrefix" as "groupCodePrefix",
         COALESCE(SUM(jl.debit), 0) as "totalDebit",
         COALESCE(SUM(jl.credit), 0) as "totalCredit",
         COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_lines jl ON jl."accountId" = coa.id
       LEFT JOIN journal_entries je ON je.id = jl."entryId"
         AND je."isPosted" = true
         AND je."tenantId" = :tenantId
         AND je."date" BETWEEN :from AND :to
         ${journalClause}
       LEFT JOIN account_groups ag ON ag.id = coa."groupId"
       WHERE coa."tenantId" = :tenantId AND coa."deletedAt" IS NULL
       GROUP BY coa.id, coa.code, coa."nameEn", coa."nameAr", coa."type",
                coa."groupId", ag."nameEn", ag."nameAr", ag."codePrefix"
       HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
       ORDER BY coa.code`,
      {
        tenantId,
        from,
        to,
        journalId: options?.journalId ?? null,
      },
    );

    if (options?.groupByAccountGroup) {
      return { data: this.groupByAccountGroup(rows), from, to };
    }

    return { data: rows, from, to };
  }

  async generalLedger(tenantId: string, accountId: string, from: string, to: string) {
    const rows = await this.journalEntriesRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
         je."entryNumber",
         je."date" as "entryDate",
         je.description,
         je."journalId",
         j."nameEn" as "journalNameEn",
         j."nameAr" as "journalNameAr",
         jl."partnerId",
         jl.debit,
         jl.credit,
         SUM(jl.debit - jl.credit) OVER (ORDER BY je."date", je."entryNumber") as "runningBalance",
         jl.currency as "currencyCode",
         jl."currencyId",
         jl."amountCurrency",
         jl."exchangeRate"
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl."entryId"
       LEFT JOIN journals j ON j.id = je."journalId"
       WHERE jl."accountId" = :accountId
         AND je."tenantId" = :tenantId
         AND je."isPosted" = true
         AND je."date" BETWEEN :from AND :to
       ORDER BY je."date", je."entryNumber"`,
      { accountId, tenantId, from, to },
    );

    return { data: rows, accountId, from, to };
  }

  /**
   * Income statement (P&L).
   * Supports cost center breakdown — if costCenterId is provided, filters by that cost center.
   * If costCenterBreakdown is true, returns totals broken down by cost center.
   */
  async incomeStatement(
    tenantId: string,
    from: string,
    to: string,
    costCenterId?: string,
    options?: { costCenterBreakdown?: boolean; journalId?: string },
  ) {
    const costCenterClause = costCenterId ? `AND jl."costCenterId" = :costCenterId` : '';
    const journalClause = options?.journalId ? `AND je."journalId" = :journalId` : '';

    if (options?.costCenterBreakdown) {
      return this.incomeStatementByCostCenter(tenantId, from, to, options.journalId);
    }

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
         ${journalClause}
       GROUP BY coa."type"`,
      {
        tenantId,
        from,
        to,
        costCenterId: costCenterId ?? null,
        journalId: options?.journalId ?? null,
      },
    );

    let revenue = 0;
    const cogs = 0;
    let expenses = 0;

    for (const row of rows) {
      const total = parseFloat(String(row.total ?? 0));
      if (row.accountType === AccountType.REVENUE) revenue += total;
      else if (row.accountType === AccountType.EXPENSE) {
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
         coa."nameEn",
         coa."nameAr",
         coa."type" as "accountType",
         coa."normalBalance",
         coa."groupId",
         ag."nameEn" as "groupNameEn",
         ag."nameAr" as "groupNameAr",
         COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_lines jl ON jl."accountId" = coa.id
       LEFT JOIN journal_entries je ON je.id = jl."entryId"
         AND je."isPosted" = true
         AND je."tenantId" = :tenantId
         AND je."date" <= :asOfDate
       LEFT JOIN account_groups ag ON ag.id = coa."groupId"
       WHERE coa."tenantId" = :tenantId AND coa."deletedAt" IS NULL
         AND coa."type" IN ('asset', 'liability', 'equity')
       GROUP BY coa.id, coa.code, coa."nameEn", coa."nameAr", coa."type", coa."normalBalance",
                coa."groupId", ag."nameEn", ag."nameAr"
       HAVING COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) <> 0
       ORDER BY coa.code`,
      { tenantId, asOfDate },
    );

    const assets = rows.filter((r) => r.accountType === AccountType.ASSET);
    const liabilities = rows.filter((r) => r.accountType === AccountType.LIABILITY);
    const equity = rows.filter((r) => r.accountType === AccountType.EQUITY);

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
         je."journalId",
         jl."partnerId",
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

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Group trial balance rows by account_groups for hierarchical display.
   */
  private groupByAccountGroup(rows: Record<string, unknown>[]) {
    const grouped = new Map<
      string | null,
      {
        groupId: string | null;
        groupNameEn: string | null;
        groupNameAr: string | null;
        groupCodePrefix: string | null;
        accounts: Record<string, unknown>[];
        totalDebit: number;
        totalCredit: number;
        balance: number;
      }
    >();

    for (const row of rows) {
      const groupId = (row.groupId as string) ?? null;
      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          groupId,
          groupNameEn: (row.groupNameEn as string) ?? null,
          groupNameAr: (row.groupNameAr as string) ?? null,
          groupCodePrefix: (row.groupCodePrefix as string) ?? null,
          accounts: [],
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        });
      }
      const group = grouped.get(groupId)!;
      group.accounts.push(row);
      group.totalDebit += parseFloat(String(row.totalDebit ?? 0));
      group.totalCredit += parseFloat(String(row.totalCredit ?? 0));
      group.balance += parseFloat(String(row.balance ?? 0));
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const prefixA = a.groupCodePrefix ?? 'zzz';
      const prefixB = b.groupCodePrefix ?? 'zzz';
      return prefixA.localeCompare(prefixB);
    });
  }

  /**
   * Income statement with breakdown by cost center.
   */
  private async incomeStatementByCostCenter(
    tenantId: string,
    from: string,
    to: string,
    journalId?: string,
  ) {
    const journalClause = journalId ? `AND je."journalId" = :journalId` : '';

    const rows = await this.journalEntriesRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
         cc.id as "costCenterId",
         cc.code as "costCenterCode",
         cc."nameEn" as "costCenterNameEn",
         cc."nameAr" as "costCenterNameAr",
         coa."type" as "accountType",
         SUM(
           CASE WHEN coa."normalBalance" = 'credit' THEN jl.credit - jl.debit
                ELSE jl.debit - jl.credit END
         ) as total
       FROM journal_lines jl
       JOIN chart_of_accounts coa ON coa.id = jl."accountId"
       JOIN journal_entries je ON je.id = jl."entryId"
       LEFT JOIN cost_centers cc ON cc.id = jl."costCenterId"
       WHERE je."tenantId" = :tenantId
         AND je."isPosted" = true
         AND je."date" BETWEEN :from AND :to
         AND (coa.code LIKE '4%' OR coa.code LIKE '5%' OR coa.code LIKE '6%')
         ${journalClause}
       GROUP BY cc.id, cc.code, cc."nameEn", cc."nameAr", coa."type"
       ORDER BY cc.code`,
      { tenantId, from, to, journalId: journalId ?? null },
    );

    // Group by cost center
    const costCenters = new Map<
      string | null,
      {
        costCenterId: string | null;
        costCenterCode: string | null;
        costCenterNameEn: string | null;
        costCenterNameAr: string | null;
        revenue: number;
        expenses: number;
        netIncome: number;
      }
    >();

    for (const row of rows) {
      const ccId = (row.costCenterId as string) ?? null;
      if (!costCenters.has(ccId)) {
        costCenters.set(ccId, {
          costCenterId: ccId,
          costCenterCode: (row.costCenterCode as string) ?? null,
          costCenterNameEn: (row.costCenterNameEn as string) ?? null,
          costCenterNameAr: (row.costCenterNameAr as string) ?? null,
          revenue: 0,
          expenses: 0,
          netIncome: 0,
        });
      }

      const cc = costCenters.get(ccId)!;
      const total = parseFloat(String(row.total ?? 0));
      if (row.accountType === AccountType.REVENUE) {
        cc.revenue += total;
      } else if (row.accountType === AccountType.EXPENSE) {
        cc.expenses += total;
      }
    }

    // Calculate net income per cost center
    for (const cc of costCenters.values()) {
      cc.netIncome = cc.revenue - cc.expenses;
    }

    return {
      costCenters: Array.from(costCenters.values()),
      from,
      to,
    };
  }
}
