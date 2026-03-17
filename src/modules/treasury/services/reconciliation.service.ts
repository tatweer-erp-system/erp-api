import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { BankReconciliationsRepository } from '@/database/sql/repositories/bank-reconciliations.repository';
import { BankStatementsRepository } from '@/database/sql/repositories/bank-statements.repository';
import { BankStatementLinesRepository } from '@/database/sql/repositories/bank-statement-lines.repository';
import { CurrencyService } from '@/modules/currency/currency.service';
import { CreateReconciliationDto } from '../dto/create-reconciliation.dto';
import { MatchTransactionsDto } from '../dto/match-transactions.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ReconciliationStatus, TreasuryTransactionType } from '@/common/enums/accounting.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PaginationDto } from '@/common/dto/pagination.dto';

/** Date proximity threshold in days for auto-matching */
const DATE_PROXIMITY_DAYS = 3;

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly accountsRepository: TreasuryAccountsRepository,
    private readonly transactionsRepository: TreasuryTransactionsRepository,
    private readonly reconciliationsRepository: BankReconciliationsRepository,
    private readonly statementsRepository: BankStatementsRepository,
    private readonly statementLinesRepository: BankStatementLinesRepository,
    private readonly currencyService: CurrencyService,
  ) {}

  // ── Create reconciliation session ──────────────────────────────────────────

  async create(
    tenantId: string,
    dto: CreateReconciliationDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Validate account exists and belongs to tenant
      const account = await this.accountsRepository.findOne({
        tenantId,
        where: { id: dto.accountId },
        transaction,
      });
      if (!account) {
        throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, dto.accountId));
      }
      const accountData = account as unknown as Record<string, unknown>;

      // Convert closing balance to base currency for comparison
      const currencyCode = String(accountData.currency);
      const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
      let closingBalanceBase = dto.closingBalance;
      if (currencyCode !== baseCurrency.code) {
        const result = await this.currencyService.toBase(
          tenantId,
          dto.closingBalance,
          baseCurrency.id,
          dto.statementDate,
        );
        closingBalanceBase = result.amount;
      }

      // Calculate systemBalance: sum of all transactions up to statementDate in base currency
      const systemBalanceRows = await this.transactionsRepository.rawQuery<
        { systemBalance: string }[]
      >(
        `SELECT COALESCE(SUM(
          CASE WHEN type IN ('receipt', 'transferIn', 'openingBalance') THEN amount
               ELSE -amount END
        ), 0) AS "systemBalance"
         FROM treasury_transactions
         WHERE "accountId" = :accountId
           AND "tenantId" = :tenantId
           AND date <= :statementDate
           AND "deletedAt" IS NULL`,
        { accountId: dto.accountId, tenantId, statementDate: dto.statementDate },
      );
      const systemBalance = parseFloat(String(systemBalanceRows?.[0]?.systemBalance ?? 0));

      // Convert opening balance to base
      let openingBalanceBase = dto.openingBalance;
      if (currencyCode !== baseCurrency.code) {
        const openingResult = await this.currencyService.toBase(
          tenantId,
          dto.openingBalance,
          baseCurrency.id,
          dto.statementDate,
        );
        openingBalanceBase = openingResult.amount;
      }

      const difference = Math.round((closingBalanceBase - systemBalance) * 100) / 100;

      const reconciliation = await this.reconciliationsRepository.create(
        {
          accountId: dto.accountId,
          statementDate: dto.statementDate,
          openingBalance: openingBalanceBase,
          closingBalance: closingBalanceBase,
          systemBalance,
          difference,
          status: ReconciliationStatus.IN_PROGRESS,
          notes: dto.notes ?? null,
          reconciledBy: null,
          completedAt: null,
        } as any,
        { bypassTenantScope: true, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return reconciliation;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── List reconciliations ────────────────────────────────────────────────────

  async findAll(tenantId: string, pagination: PaginationDto) {
    // Find all reconciliations for accounts belonging to this tenant
    const rows = await this.reconciliationsRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT r.*
       FROM bank_reconciliations r
       INNER JOIN treasury_accounts a ON a.id = r."accountId" AND a."tenantId" = :tenantId AND a."deletedAt" IS NULL
       ORDER BY r."statementDate" DESC
       LIMIT :limit OFFSET :offset`,
      {
        tenantId,
        limit: pagination.limit ?? 20,
        offset: ((pagination.page ?? 1) - 1) * (pagination.limit ?? 20),
      },
    );

    const totalRows = await this.reconciliationsRepository.rawQuery<{ count: string }[]>(
      `SELECT COUNT(*) as count
       FROM bank_reconciliations r
       INNER JOIN treasury_accounts a ON a.id = r."accountId" AND a."tenantId" = :tenantId AND a."deletedAt" IS NULL`,
      { tenantId },
    );
    const total = parseInt(String(totalRows?.[0]?.count ?? 0), 10);
    const limit = pagination.limit ?? 20;

    return {
      data: rows,
      meta: {
        page: pagination.page ?? 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get reconciliation by ID ────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const rows = await this.reconciliationsRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT r.*
       FROM bank_reconciliations r
       INNER JOIN treasury_accounts a ON a.id = r."accountId" AND a."tenantId" = :tenantId AND a."deletedAt" IS NULL
       WHERE r.id = :id`,
      { tenantId, id },
    );
    if (!rows || rows.length === 0) {
      throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_NOT_FOUND, id));
    }
    return rows[0];
  }

  // ── List unmatched transactions ─────────────────────────────────────────────

  async getUnmatched(tenantId: string, reconciliationId: string) {
    const reconciliation = await this.findById(tenantId, reconciliationId);
    const accountId = String(reconciliation.accountId);

    return this.transactionsRepository.findAllRaw({
      tenantId,
      where: { accountId, isReconciled: false },
      order: [['date', 'ASC']],
    });
  }

  // ── Match transactions ──────────────────────────────────────────────────────

  async matchTransactions(
    tenantId: string,
    reconciliationId: string,
    dto: MatchTransactionsDto,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const reconciliation = await this.findById(tenantId, reconciliationId);
      if (String(reconciliation.status) === ReconciliationStatus.COMPLETED) {
        throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_ALREADY_COMPLETED));
      }

      // Mark transactions as reconciled
      await this.transactionsRepository.bulkUpdate({
        where: { id: dto.transactionIds, tenantId },
        data: { isReconciled: true, reconciliationId } as any,
        tenantId,
        transaction,
      });

      if (isOwner) await transaction.commit();
      return { matched: dto.transactionIds.length };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Unmatch transactions ────────────────────────────────────────────────────

  async unmatchTransactions(
    tenantId: string,
    reconciliationId: string,
    dto: MatchTransactionsDto,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const reconciliation = await this.findById(tenantId, reconciliationId);
      if (String(reconciliation.status) === ReconciliationStatus.COMPLETED) {
        throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_ALREADY_COMPLETED));
      }

      await this.transactionsRepository.bulkUpdate({
        where: { id: dto.transactionIds, reconciliationId, tenantId },
        data: { isReconciled: false, reconciliationId: null } as any,
        tenantId,
        transaction,
      });

      if (isOwner) await transaction.commit();
      return { unmatched: dto.transactionIds.length };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Complete reconciliation ─────────────────────────────────────────────────

  async complete(
    tenantId: string,
    reconciliationId: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const reconciliation = await this.findById(tenantId, reconciliationId);

      if (String(reconciliation.status) === ReconciliationStatus.COMPLETED) {
        throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_ALREADY_COMPLETED));
      }

      const difference = parseFloat(String(reconciliation.difference ?? 0));
      if (difference !== 0) {
        throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_NOT_ZERO, difference));
      }

      await this.reconciliationsRepository.update(
        reconciliationId,
        {
          status: ReconciliationStatus.COMPLETED,
          reconciledBy: auditContext.userId ?? null,
          completedAt: new Date(),
        } as any,
        { bypassTenantScope: true, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return await this.findById(tenantId, reconciliationId);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Import bank statement (delegates to bank_statements module) ───────────

  async importStatement(
    tenantId: string,
    reconciliationId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ) {
    // Validate reconciliation exists and belongs to tenant
    await this.findById(tenantId, reconciliationId);

    const rows = this.parseFile(fileBuffer, mimeType);
    return { reconciliationId, rows, count: rows.length };
  }

  // ── Auto-match against bank statement lines AND treasury transactions ─────

  /**
   * Enhanced auto-match: matches bank statement lines against treasury_transactions
   * and payments. Runs within a reconciliation context.
   */
  async autoMatchForReconciliation(
    tenantId: string,
    reconciliationId: string,
    statementId: string,
    auditContext: AuditContext,
  ) {
    const reconciliation = await this.findById(tenantId, reconciliationId);
    if (String(reconciliation.status) === ReconciliationStatus.COMPLETED) {
      throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_ALREADY_COMPLETED));
    }

    const accountId = String(reconciliation.accountId);

    // Get unreconciled bank statement lines
    const unreconciledLines = await this.statementLinesRepository.findAllRaw({
      tenantId,
      where: { statementId, isReconciled: false },
    });

    const transaction = await this.accountsRepository.createTransaction({});

    try {
      let matchedCount = 0;

      for (const line of unreconciledLines) {
        const lineData = line as any;
        const lineAmount = parseFloat(String(lineData.amount));
        const lineDate = String(lineData.date);

        // Try exact amount match against treasury transactions for this account
        const treasuryMatch = await this.findMatchingTreasuryTransaction(
          tenantId,
          accountId,
          lineAmount,
          lineDate,
          transaction,
        );

        if (treasuryMatch) {
          // Mark the bank statement line as reconciled
          await this.statementLinesRepository.update(
            lineData.id,
            {
              isReconciled: true,
              paymentId: treasuryMatch.paymentId ?? null,
              journalEntryId: treasuryMatch.journalEntryId ?? null,
            } as any,
            { tenantId, transaction, auditContext },
          );

          // Also mark the treasury transaction as reconciled
          if (treasuryMatch.transactionId) {
            await this.transactionsRepository.bulkUpdate({
              where: { id: [treasuryMatch.transactionId], tenantId },
              data: { isReconciled: true, reconciliationId } as any,
              tenantId,
              transaction,
            });
          }

          matchedCount++;
        }
      }

      await transaction.commit();

      return {
        totalLines: unreconciledLines.length,
        matched: matchedCount,
        unmatched: unreconciledLines.length - matchedCount,
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private parseFile(
    buffer: Buffer,
    mimeType: string,
  ): Array<{
    date?: string;
    description?: string;
    debit?: string;
    credit?: string;
    reference?: string;
  }> {
    // Parse CSV with simple split (no external dependency)
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, ''),
    );
    const dateIdx = headers.findIndex((h) => h === 'date');
    const descIdx = headers.findIndex((h) => h.includes('desc'));
    const debitIdx = headers.findIndex((h) => h === 'debit');
    const creditIdx = headers.findIndex((h) => h === 'credit');
    const refIdx = headers.findIndex((h) => h.includes('ref'));

    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      return {
        date: dateIdx >= 0 ? cols[dateIdx] : undefined,
        description: descIdx >= 0 ? cols[descIdx] : undefined,
        debit: debitIdx >= 0 ? cols[debitIdx] : undefined,
        credit: creditIdx >= 0 ? cols[creditIdx] : undefined,
        reference: refIdx >= 0 ? cols[refIdx] : undefined,
      };
    });
  }

  /**
   * Attempts to find a matching treasury transaction by exact amount
   * and date proximity (within DATE_PROXIMITY_DAYS).
   */
  private async findMatchingTreasuryTransaction(
    tenantId: string,
    accountId: string,
    amount: number,
    date: string,
    transaction: Transaction,
  ): Promise<{
    transactionId?: string;
    paymentId?: string;
    journalEntryId?: string;
  } | null> {
    // Match against treasury_transactions: exact amount, date within ±3 days, unreconciled
    const absAmount = Math.abs(amount);
    const isCredit = amount > 0;

    // Build type filter: positive amounts match receipts/transferIn, negative match payments/transferOut
    const typeFilter = isCredit
      ? `type IN ('${TreasuryTransactionType.RECEIPT}', '${TreasuryTransactionType.TRANSFER_IN}')`
      : `type IN ('${TreasuryTransactionType.PAYMENT}', '${TreasuryTransactionType.TRANSFER_OUT}')`;

    const rows = await this.transactionsRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT id, "paymentId", "journalEntryId"
       FROM treasury_transactions
       WHERE "accountId" = :accountId
         AND "tenantId" = :tenantId
         AND "isReconciled" = false
         AND ${typeFilter}
         AND amount = :absAmount
         AND ABS(date - :date::date) <= :proximityDays
         AND "deletedAt" IS NULL
       ORDER BY ABS(date - :date::date) ASC
       LIMIT 1`,
      { accountId, tenantId, absAmount, date, proximityDays: DATE_PROXIMITY_DAYS },
      transaction,
    );

    if (rows && rows.length > 0) {
      return {
        transactionId: rows[0].id as string,
        paymentId: (rows[0].paymentId as string) ?? undefined,
        journalEntryId: (rows[0].journalEntryId as string) ?? undefined,
      };
    }

    return null;
  }
}
