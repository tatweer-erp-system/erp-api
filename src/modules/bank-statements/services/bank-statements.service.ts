import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BankStatementsRepository } from '@/database/sql/repositories/bank-statements.repository';
import { BankStatementLinesRepository } from '@/database/sql/repositories/bank-statement-lines.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { BankStatementStatus } from '@/common/enums/bank-statement.enums';
import { TreasuryTransactionType } from '@/common/enums/accounting.enums';
import { CreateBankStatementDto } from '../dto/create-bank-statement.dto';
import { UpdateBankStatementDto } from '../dto/update-bank-statement.dto';
import { FilterBankStatementDto } from '../dto/filter-bank-statement.dto';
import { CreateBankStatementLineDto } from '../dto/create-bank-statement-line.dto';
import { MatchLineDto } from '../dto/match-line.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

/** Date proximity threshold in days for auto-matching */
const DATE_PROXIMITY_DAYS = 3;

@Injectable()
export class BankStatementsService {
  private readonly logger = new Logger(BankStatementsService.name);

  constructor(
    private readonly statementsRepository: BankStatementsRepository,
    private readonly linesRepository: BankStatementLinesRepository,
    private readonly treasuryTransactionsRepository: TreasuryTransactionsRepository,
  ) {}

  // ── Statement CRUD ────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    dto: CreateBankStatementDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.statementsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const statement = await this.statementsRepository.create(
        {
          branchId: dto.branchId,
          journalId: dto.journalId ?? null,
          name: dto.name,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
          balanceStart: dto.balanceStart,
          balanceEnd: dto.balanceEnd,
          balanceEndReal: null,
          status: BankStatementStatus.OPEN,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return statement;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async findAll(tenantId: string, filter: FilterBankStatementDto) {
    const where: Record<string, unknown> = {};
    if (filter.branchId) where.branchId = filter.branchId;
    if (filter.status) where.status = filter.status;

    return this.statementsRepository.findAll({
      tenantId,
      where,
      page: filter.page,
      limit: filter.limit,
      search: filter.search,
      searchFields: ['name'],
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const statement = await this.statementsRepository.findOne({
      tenantId,
      where: { id },
    });
    if (!statement) {
      throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_NOT_FOUND, id));
    }
    return statement;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateBankStatementDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.statementsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.statementsRepository.findOne({
        tenantId,
        where: { id },
        transaction,
      });
      if (!existing) {
        throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_NOT_FOUND, id));
      }

      const status = (existing as any).status as BankStatementStatus;
      if (status !== BankStatementStatus.OPEN) {
        throw new BadRequestException(msg(ErrorMessages.BANK_STATEMENT_NOT_OPEN, id, status));
      }

      const updated = await this.statementsRepository.update(id, dto as any, {
        tenantId,
        transaction,
        auditContext,
      });

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const statement = await this.statementsRepository.findOne({
      tenantId,
      where: { id },
    });
    if (!statement) {
      throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_NOT_FOUND, id));
    }

    const status = (statement as any).status as BankStatementStatus;
    if (status !== BankStatementStatus.OPEN) {
      throw new BadRequestException(msg(ErrorMessages.BANK_STATEMENT_NOT_OPEN, id, status));
    }

    await this.statementsRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Lines ─────────────────────────────────────────────────────────────────

  async findLines(tenantId: string, statementId: string, pagination: PaginationDto) {
    // Verify statement exists
    await this.findById(tenantId, statementId);

    return this.linesRepository.findAll({
      tenantId,
      where: { statementId },
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['reference', 'partnerName'],
      sortBy: pagination.sortBy ?? 'date',
      sortOrder: pagination.sortOrder,
    });
  }

  async addLine(
    tenantId: string,
    statementId: string,
    dto: CreateBankStatementLineDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.statementsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const statement = await this.statementsRepository.findOne({
        tenantId,
        where: { id: statementId },
        transaction,
      });
      if (!statement) {
        throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_NOT_FOUND, statementId));
      }

      const status = (statement as any).status as BankStatementStatus;
      if (status !== BankStatementStatus.OPEN) {
        throw new BadRequestException(
          msg(ErrorMessages.BANK_STATEMENT_NOT_OPEN, statementId, status),
        );
      }

      const line = await this.linesRepository.create(
        {
          branchId: (statement as any).branchId,
          statementId,
          date: dto.date,
          reference: dto.reference ?? null,
          partnerName: dto.partnerName ?? null,
          amount: dto.amount,
          isReconciled: false,
          journalEntryId: null,
          paymentId: null,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return line;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async removeLine(tenantId: string, lineId: string, auditContext: AuditContext) {
    const line = await this.linesRepository.findOne({
      tenantId,
      where: { id: lineId },
    });
    if (!line) {
      throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_LINE_NOT_FOUND, lineId));
    }
    if ((line as any).isReconciled) {
      throw new BadRequestException(msg(ErrorMessages.BANK_STATEMENT_LINE_RECONCILED, lineId));
    }
    await this.linesRepository.softDelete(lineId, { tenantId, auditContext });
  }

  // ── Import CSV ────────────────────────────────────────────────────────────

  async importLines(
    tenantId: string,
    statementId: string,
    fileContent: string,
    auditContext: AuditContext,
  ) {
    const statement = await this.findById(tenantId, statementId);
    const status = (statement as any).status as BankStatementStatus;
    if (status !== BankStatementStatus.OPEN) {
      throw new BadRequestException(
        msg(ErrorMessages.BANK_STATEMENT_NOT_OPEN, statementId, status),
      );
    }

    const lines = this.parseCsv(fileContent);
    if (lines.length === 0) {
      throw new BadRequestException(msg(ErrorMessages.BANK_STATEMENT_IMPORT_EMPTY, statementId));
    }

    const transaction = await this.statementsRepository.createTransaction({});

    try {
      const branchId = (statement as any).branchId;

      const records = lines.map((line) => ({
        tenantId,
        branchId,
        statementId,
        date: line.date,
        reference: line.reference || null,
        partnerName: line.partnerName || null,
        amount: line.amount,
        isReconciled: false,
        journalEntryId: null,
        paymentId: null,
      }));

      const created = await this.linesRepository.bulkCreate({
        data: records as any[],
        tenantId,
        transaction,
        auditContext,
      });

      await transaction.commit();

      return { imported: created.length };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  // ── Auto-match ────────────────────────────────────────────────────────────

  async autoMatch(tenantId: string, statementId: string, auditContext: AuditContext) {
    const statement = await this.findById(tenantId, statementId);
    const status = (statement as any).status as BankStatementStatus;
    if (status !== BankStatementStatus.OPEN) {
      throw new BadRequestException(
        msg(ErrorMessages.BANK_STATEMENT_NOT_OPEN, statementId, status),
      );
    }

    // Get unreconciled lines
    const unreconciledLines = await this.linesRepository.findAllRaw({
      tenantId,
      where: { statementId, isReconciled: false },
    });

    const transaction = await this.statementsRepository.createTransaction({});

    try {
      let matchedCount = 0;

      for (const line of unreconciledLines) {
        const lineData = line as any;

        // Try to find matching treasury transaction or payment by exact amount
        const amountMatch = await this.findMatchingPayment(
          tenantId,
          parseFloat(String(lineData.amount)),
          lineData.partnerName,
          lineData.date,
          transaction,
        );

        if (amountMatch) {
          await this.linesRepository.update(
            lineData.id,
            {
              isReconciled: true,
              paymentId: amountMatch.paymentId ?? null,
              journalEntryId: amountMatch.journalEntryId ?? null,
            } as any,
            { tenantId, transaction, auditContext },
          );
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

  // ── Manual match / unmatch ────────────────────────────────────────────────

  async matchLine(
    tenantId: string,
    lineId: string,
    dto: MatchLineDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.statementsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const line = await this.linesRepository.findOne({
        tenantId,
        where: { id: lineId },
        transaction,
      });
      if (!line) {
        throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_LINE_NOT_FOUND, lineId));
      }

      if ((line as any).isReconciled) {
        throw new BadRequestException(msg(ErrorMessages.BANK_STATEMENT_LINE_RECONCILED, lineId));
      }

      const updateData: Record<string, unknown> = { isReconciled: true };
      if (dto.paymentId) updateData.paymentId = dto.paymentId;
      if (dto.journalEntryId) updateData.journalEntryId = dto.journalEntryId;

      const updated = await this.linesRepository.update(lineId, updateData as any, {
        tenantId,
        transaction,
        auditContext,
      });

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async unmatchLine(
    tenantId: string,
    lineId: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.statementsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const line = await this.linesRepository.findOne({
        tenantId,
        where: { id: lineId },
        transaction,
      });
      if (!line) {
        throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_LINE_NOT_FOUND, lineId));
      }

      if (!(line as any).isReconciled) {
        throw new BadRequestException(
          msg(ErrorMessages.BANK_STATEMENT_LINE_NOT_RECONCILED, lineId),
        );
      }

      const updated = await this.linesRepository.update(
        lineId,
        {
          isReconciled: false,
          paymentId: null,
          journalEntryId: null,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Validate / Post ───────────────────────────────────────────────────────

  async validate(tenantId: string, statementId: string, auditContext: AuditContext) {
    const transaction = await this.statementsRepository.createTransaction({});

    try {
      const statement = await this.statementsRepository.findOne({
        tenantId,
        where: { id: statementId },
        transaction,
      });
      if (!statement) {
        throw new NotFoundException(msg(ErrorMessages.BANK_STATEMENT_NOT_FOUND, statementId));
      }

      const status = (statement as any).status as BankStatementStatus;
      if (status !== BankStatementStatus.OPEN) {
        throw new BadRequestException(
          msg(ErrorMessages.BANK_STATEMENT_NOT_OPEN, statementId, status),
        );
      }

      // Calculate real ending balance from lines
      const allLines = await this.linesRepository.findAllRaw({
        tenantId,
        where: { statementId },
        transaction,
      });

      const totalAmount = allLines.reduce((sum, line) => sum + Number((line as any).amount), 0);
      const balanceEndReal = Number((statement as any).balanceStart) + totalAmount;

      // Update statement status to posted and set real balance
      await this.statementsRepository.update(
        statementId,
        {
          status: BankStatementStatus.POSTED,
          balanceEndReal: Math.round(balanceEndReal * 100) / 100,
        } as any,
        { tenantId, transaction, auditContext },
      );

      await transaction.commit();

      return {
        statementId,
        status: BankStatementStatus.POSTED,
        balanceStart: (statement as any).balanceStart,
        balanceEnd: (statement as any).balanceEnd,
        balanceEndReal: Math.round(balanceEndReal * 100) / 100,
        totalLines: allLines.length,
        reconciledLines: allLines.filter((l) => (l as any).isReconciled).length,
        unreconciledLines: allLines.filter((l) => !(l as any).isReconciled).length,
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private parseCsv(
    content: string,
  ): Array<{ date: string; reference: string; partnerName: string; amount: number }> {
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return []; // Need at least header + 1 row

    // Skip header row
    const dataLines = lines.slice(1);

    return dataLines
      .map((row) => {
        const cols = row.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 4) return null;

        const amount = parseFloat(cols[3]);
        if (isNaN(amount)) return null;

        return {
          date: cols[0],
          reference: cols[1] || '',
          partnerName: cols[2] || '',
          amount,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }

  /**
   * Attempts to find a matching treasury transaction or payment for auto-reconciliation.
   * Matching strategy:
   * - Exact amount match against treasury_transactions = high confidence
   * - Date proximity within ±3 days = additional confidence
   *
   * Returns the best match or null if none found.
   */
  private async findMatchingPayment(
    tenantId: string,
    amount: number,
    partnerName: string | null,
    date: string,
    transaction: Transaction,
  ): Promise<{ paymentId?: string; journalEntryId?: string } | null> {
    const absAmount = Math.abs(amount);
    const isCredit = amount > 0;

    // Match positive amounts to receipts/transferIn, negative to payments/transferOut
    const typeFilter = isCredit
      ? `type IN ('${TreasuryTransactionType.RECEIPT}', '${TreasuryTransactionType.TRANSFER_IN}')`
      : `type IN ('${TreasuryTransactionType.PAYMENT}', '${TreasuryTransactionType.TRANSFER_OUT}')`;

    const rows = await this.treasuryTransactionsRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT id, "paymentId", "journalEntryId"
       FROM treasury_transactions
       WHERE "tenantId" = :tenantId
         AND "isReconciled" = false
         AND ${typeFilter}
         AND amount = :absAmount
         AND ABS(date - :date::date) <= :proximityDays
         AND "deletedAt" IS NULL
       ORDER BY ABS(date - :date::date) ASC
       LIMIT 1`,
      { tenantId, absAmount, date, proximityDays: DATE_PROXIMITY_DAYS },
      transaction,
    );

    if (rows && rows.length > 0) {
      return {
        paymentId: (rows[0].paymentId as string) ?? undefined,
        journalEntryId: (rows[0].journalEntryId as string) ?? undefined,
      };
    }

    return null;
  }
}
