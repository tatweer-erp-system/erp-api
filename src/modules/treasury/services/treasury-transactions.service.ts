import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { CreateTreasuryTransactionDto } from '../dto/create-treasury-transaction.dto';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { TreasuryTransactionType } from '@/common/enums/treasury.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PaginationDto } from '@/common/dto/pagination.dto';

const CREDIT_TYPES = new Set<string>([TreasuryTransactionType.DEPOSIT]);

@Injectable()
export class TreasuryTransactionsService {
  private readonly logger = new Logger(TreasuryTransactionsService.name);

  constructor(
    private readonly accountsRepository: TreasuryAccountsRepository,
    private readonly transactionsRepository: TreasuryTransactionsRepository,
    private readonly journalPoster: JournalPosterSharedService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Create deposit / withdrawal ──────────────────────────────────────────────

  async create(
    branchId: string,
    dto: CreateTreasuryTransactionDto,
    auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      // Load and validate account
      const account = await this.accountsRepository.findByIdOrNull((dto as any).accountId);
      if (!account) {
        throw new BadRequestException(
          msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, (dto as any).accountId),
        );
      }

      const transactionType: string = (dto as any).type ?? (dto as any).transactionType;
      const isCredit = CREDIT_TYPES.has(transactionType);

      // For withdrawal: check sufficient balance
      if (!isCredit) {
        if (Number(account.balance) < (dto as any).amount) {
          throw new BadRequestException(
            msg(ErrorMessages.TREASURY_INSUFFICIENT_BALANCE, account.balance, (dto as any).amount),
          );
        }
      }

      const delta = isCredit ? (dto as any).amount : -(dto as any).amount;
      const updatedAccount = await this.accountsRepository.updateBalance(
        (dto as any).accountId,
        delta,
      );
      const balanceAfter = updatedAccount.balance;

      // Insert transaction record
      const txRecord = await this.transactionsRepository.create({
        branchId,
        accountId: (dto as any).accountId,
        transactionType: transactionType as TreasuryTransactionType,
        amount: (dto as any).amount,
        balanceAfter: Number(balanceAfter),
        reference: (dto as any).reference ?? null,
        date: (dto as any).date,
        description: (dto as any).description ?? null,
        toAccountId: null,
        journalEntryId: null,
      });

      return { ...txRecord, balanceAfter };
    });
  }

  // ── Transfer between accounts ───────────────────────────────────────────────

  async transfer(
    branchId: string,
    dto: CreateTransferDto,
    auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      // Load source account
      const source = await this.accountsRepository.findByIdOrNull(
        (dto as any).sourceAccountId ?? (dto as any).fromAccountId,
      );
      if (!source) {
        throw new BadRequestException(
          msg(
            ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND,
            (dto as any).sourceAccountId ?? (dto as any).fromAccountId,
          ),
        );
      }

      // Load destination account
      const destination = await this.accountsRepository.findByIdOrNull(
        (dto as any).destinationAccountId ?? (dto as any).toAccountId,
      );
      if (!destination) {
        throw new BadRequestException(
          msg(
            ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND,
            (dto as any).destinationAccountId ?? (dto as any).toAccountId,
          ),
        );
      }

      // Check source has sufficient balance
      if (Number(source.balance) < (dto as any).amount) {
        throw new BadRequestException(
          msg(ErrorMessages.TREASURY_INSUFFICIENT_BALANCE, source.balance, (dto as any).amount),
        );
      }

      const sourceId = (dto as any).sourceAccountId ?? (dto as any).fromAccountId;
      const destId = (dto as any).destinationAccountId ?? (dto as any).toAccountId;

      // Deduct from source
      const updatedSource = await this.accountsRepository.updateBalance(
        sourceId,
        -(dto as any).amount,
      );

      // Add to destination
      const updatedDest = await this.accountsRepository.updateBalance(destId, (dto as any).amount);

      // Create transferOut transaction
      const outTx = await this.transactionsRepository.create({
        branchId,
        accountId: sourceId,
        transactionType: TreasuryTransactionType.TRANSFER,
        amount: (dto as any).amount,
        balanceAfter: Number(updatedSource.balance),
        reference: (dto as any).reference ?? null,
        date: (dto as any).date,
        description: (dto as any).description ?? null,
        toAccountId: destId,
        journalEntryId: null,
      });

      // Create transferIn transaction
      const inTx = await this.transactionsRepository.create({
        branchId,
        accountId: destId,
        transactionType: TreasuryTransactionType.DEPOSIT,
        amount: (dto as any).amount,
        balanceAfter: Number(updatedDest.balance),
        reference: (dto as any).reference ?? null,
        date: (dto as any).date,
        description: (dto as any).description ?? null,
        toAccountId: null,
        journalEntryId: null,
      });

      return { outTransaction: outTx, inTransaction: inTx };
    });
  }

  // ── List transactions for an account ───────────────────────────────────────

  async findByAccount(branchId: string, accountId: string, pagination: PaginationDto) {
    const account = await this.accountsRepository.findByIdOrNull(accountId);
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, accountId));
    }

    return this.transactionsRepository.findAll(
      branchId,
      { accountId },
      pagination.page,
      pagination.limit,
    );
  }

  // ── Statement with running balance ─────────────────────────────────────────

  async getStatement(branchId: string, accountId: string, pagination: PaginationDto) {
    const account = await this.accountsRepository.findByIdOrNull(accountId);
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, accountId));
    }

    const limit = pagination.limit ?? 20;
    const page = pagination.page ?? 1;
    const offset = (page - 1) * limit;

    const rows = await this.transactionsRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT t.*,
        SUM(
          CASE WHEN t.transaction_type = '${TreasuryTransactionType.DEPOSIT}' THEN t.amount
               ELSE -t.amount END
        ) OVER (PARTITION BY t.account_id ORDER BY t.date, t.created_at) AS "runningBalance"
       FROM treasury_transactions t
       WHERE t.account_id = :accountId
         AND t.branch_id = :branchId
         AND t.deleted_at IS NULL
       ORDER BY t.date, t.created_at
       LIMIT :limit OFFSET :offset`,
      { accountId, branchId, limit, offset },
    );

    const countRows = await this.transactionsRepository.rawQuery<{ count: string }[]>(
      `SELECT COUNT(*) as count FROM treasury_transactions
       WHERE account_id = :accountId AND branch_id = :branchId AND deleted_at IS NULL`,
      { accountId, branchId },
    );
    const total = parseInt(String(countRows?.[0]?.count ?? 0), 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Get single transaction ──────────────────────────────────────────────────

  async findById(branchId: string, id: string) {
    const tx = await this.transactionsRepository.findByIdOrNull(id);
    if (!tx) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'TreasuryTransaction', id));
    }
    return tx;
  }
}
