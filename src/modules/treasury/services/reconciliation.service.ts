import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { BankReconciliationsRepository } from '@/database/sql/repositories/bank-reconciliations.repository';
import { CreateReconciliationDto } from '../dto/create-reconciliation.dto';
import { MatchTransactionsDto } from '../dto/match-transactions.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ReconciliationStatus } from '@/common/enums/treasury.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly accountsRepository: TreasuryAccountsRepository,
    private readonly transactionsRepository: TreasuryTransactionsRepository,
    private readonly reconciliationsRepository: BankReconciliationsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Create reconciliation session ──────────────────────────────────────────

  async create(
    branchId: string,
    dto: CreateReconciliationDto,
    auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      const account = await this.accountsRepository.findByIdOrNull((dto as any).accountId);
      if (!account) {
        throw new BadRequestException(
          msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, (dto as any).accountId),
        );
      }

      const statementBalance = (dto as any).closingBalance ?? (dto as any).statementBalance ?? 0;
      const systemBalance = Number(account.balance);
      const difference = Math.round((statementBalance - systemBalance) * 100) / 100;

      return this.reconciliationsRepository.create({
        branchId,
        accountId: (dto as any).accountId,
        statementDate: (dto as any).statementDate,
        statementBalance,
        systemBalance,
        difference,
        status: ReconciliationStatus.IN_PROGRESS,
        reconciledBy: null,
        reconciledAt: null,
        notes: (dto as any).notes ?? null,
      });
    });
  }

  // ── List reconciliations ────────────────────────────────────────────────────

  async findAll(branchId: string, pagination: PaginationDto) {
    return this.reconciliationsRepository.findAll(
      branchId,
      undefined,
      undefined,
      pagination.page,
      pagination.limit,
    );
  }

  // ── Get reconciliation by ID ────────────────────────────────────────────────

  async findById(branchId: string, id: string) {
    const record = await this.reconciliationsRepository.findByIdOrNull(id);
    if (!record || record.branchId !== branchId) {
      throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_NOT_FOUND, id));
    }
    return record;
  }

  // ── List unmatched transactions ─────────────────────────────────────────────

  async getUnmatched(branchId: string, reconciliationId: string) {
    const reconciliation = await this.findById(branchId, reconciliationId);
    return this.transactionsRepository.findAll(branchId, {
      accountId: reconciliation.accountId,
    });
  }

  // ── Match transactions ──────────────────────────────────────────────────────

  async matchTransactions(
    branchId: string,
    reconciliationId: string,
    dto: MatchTransactionsDto,
    _containerTransaction?: unknown,
  ) {
    const reconciliation = await this.findById(branchId, reconciliationId);
    if (reconciliation.status === ReconciliationStatus.RECONCILED) {
      throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_ALREADY_COMPLETED));
    }

    // This is a simplified match — in a full implementation, a reconciliation_lines table
    // would store the matched transaction IDs. For now we return the count.
    return { matched: (dto as any).transactionIds?.length ?? 0 };
  }

  // ── Unmatch transactions ────────────────────────────────────────────────────

  async unmatchTransactions(
    branchId: string,
    reconciliationId: string,
    dto: MatchTransactionsDto,
    _containerTransaction?: unknown,
  ) {
    const reconciliation = await this.findById(branchId, reconciliationId);
    if (reconciliation.status === ReconciliationStatus.RECONCILED) {
      throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_ALREADY_COMPLETED));
    }

    return { unmatched: (dto as any).transactionIds?.length ?? 0 };
  }

  // ── Complete reconciliation ─────────────────────────────────────────────────

  async complete(
    branchId: string,
    reconciliationId: string,
    auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      const reconciliation = await this.findById(branchId, reconciliationId);

      if (reconciliation.status === ReconciliationStatus.RECONCILED) {
        throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_ALREADY_COMPLETED));
      }

      const difference = parseFloat(String(reconciliation.difference ?? 0));
      if (difference !== 0) {
        throw new BadRequestException(msg(ErrorMessages.RECONCILIATION_NOT_ZERO, difference));
      }

      return this.reconciliationsRepository.reconcile(reconciliationId, auditContext.userId ?? '');
    });
  }

  // ── Import bank statement ───────────────────────────────────────────────────

  async importStatement(
    branchId: string,
    reconciliationId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ) {
    await this.findById(branchId, reconciliationId);
    const rows = this.parseFile(fileBuffer, mimeType);
    return { reconciliationId, rows, count: rows.length };
  }

  private parseFile(
    buffer: Buffer,
    _mimeType: string,
  ): Array<{
    date?: string;
    description?: string;
    debit?: string;
    credit?: string;
    reference?: string;
  }> {
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
}
