import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';
import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { CurrencyService } from '@/modules/currency/currency.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { CreateTreasuryTransactionDto } from '../dto/create-treasury-transaction.dto';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { TreasuryTransactionType } from '@/common/enums/accounting.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PaginationDto } from '@/common/dto/pagination.dto';

const CREDIT_TYPES = new Set<TreasuryTransactionType>([
  TreasuryTransactionType.RECEIPT,
  TreasuryTransactionType.TRANSFER_IN,
  TreasuryTransactionType.OPENING_BALANCE,
]);

@Injectable()
export class TreasuryTransactionsService {
  private readonly logger = new Logger(TreasuryTransactionsService.name);

  constructor(
    private readonly accountsRepository: TreasuryAccountsRepository,
    private readonly transactionsRepository: TreasuryTransactionsRepository,
    private readonly currencyService: CurrencyService,
    private readonly journalPoster: JournalPosterSharedService,
  ) {}

  // ── Create receipt / payment / opening balance ──────────────────────────────

  async create(
    tenantId: string,
    dto: CreateTreasuryTransactionDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Load and validate account
      const account = await this.accountsRepository.findOne({
        tenantId,
        where: { id: dto.accountId },
        transaction,
      });
      if (!account) {
        throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, dto.accountId));
      }
      const accountData = account as unknown as Record<string, unknown>;

      // Resolve currency code to UUID, then convert
      const currencyCode = String(accountData.currency);
      const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
      let amountBase = dto.amount;
      let exchangeRate = 1;
      if (currencyCode !== baseCurrency.code) {
        const result = await this.currencyService.toBase(
          tenantId,
          dto.amount,
          baseCurrency.id, // fallback — will be overridden below
          dto.date,
        );
        amountBase = result.amount;
        exchangeRate = result.rate;
      }

      // For payment/transferOut: check sufficient balance
      if (!CREDIT_TYPES.has(dto.type)) {
        const currentBalance = parseFloat(String(accountData.currentBalance ?? 0));
        if (currentBalance < dto.amount) {
          throw new BadRequestException(
            msg(ErrorMessages.TREASURY_INSUFFICIENT_BALANCE, currentBalance, dto.amount),
          );
        }
      }

      // Atomic balance update using rawQuery
      const isCredit = CREDIT_TYPES.has(dto.type);
      const operator = isCredit ? '+' : '-';
      const updated = await this.accountsRepository.rawQuery<{ currentBalance: string }[]>(
        `UPDATE treasury_accounts
         SET "currentBalance" = "currentBalance" ${operator} :amount
         WHERE id = :accountId AND "tenantId" = :tenantId
         RETURNING "currentBalance"`,
        { amount: dto.amount, accountId: dto.accountId, tenantId },
        transaction,
      );

      const balanceAfter = updated?.[0]
        ? parseFloat(String(updated[0].currentBalance))
        : parseFloat(String(accountData.currentBalance));

      // Insert transaction record
      const txRecord = await this.transactionsRepository.create(
        {
          accountId: dto.accountId,
          type: dto.type,
          amount: dto.amount,
          currency: String(accountData.currency),
          exchangeRate,
          reference: dto.reference ?? null,
          contactId: dto.contactId ?? null,
          date: dto.date,
          description: dto.description ?? null,
          isReconciled: false,
          reconciliationId: null,
          journalEntryId: null,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();

      // Auto-post journal entry (fire-and-forget, treasury is source of truth)
      if (dto.type !== TreasuryTransactionType.OPENING_BALANCE) {
        this.postJournalEntry(
          tenantId,
          txRecord,
          accountData,
          dto.amount,
          amountBase,
          exchangeRate,
          auditContext,
        ).catch((err) =>
          this.logger.error(
            `Journal posting failed for transaction ${(txRecord as any).id}: ${err?.message}`,
          ),
        );
      }

      return { ...txRecord, balanceAfter };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Transfer between accounts ───────────────────────────────────────────────

  async transfer(
    tenantId: string,
    dto: CreateTransferDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Load source account
      const source = await this.accountsRepository.findOne({
        tenantId,
        where: { id: dto.sourceAccountId },
        transaction,
      });
      if (!source) {
        throw new BadRequestException(
          msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, dto.sourceAccountId),
        );
      }
      const sourceData = source as unknown as Record<string, unknown>;

      // Load destination account
      const destination = await this.accountsRepository.findOne({
        tenantId,
        where: { id: dto.destinationAccountId },
        transaction,
      });
      if (!destination) {
        throw new BadRequestException(
          msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, dto.destinationAccountId),
        );
      }
      const destData = destination as unknown as Record<string, unknown>;

      // Check source has sufficient balance
      const sourceBalance = parseFloat(String(sourceData.currentBalance ?? 0));
      if (sourceBalance < dto.amount) {
        throw new BadRequestException(
          msg(ErrorMessages.TREASURY_INSUFFICIENT_BALANCE, sourceBalance, dto.amount),
        );
      }

      // Resolve exchange rates for both accounts
      const srcCurrencyCode = String(sourceData.currency);
      const baseCurrencyForTransfer = await this.currencyService.getBaseCurrency(tenantId);
      let sourceAmountBase = dto.amount;
      let sourceRate = 1;
      if (srcCurrencyCode !== baseCurrencyForTransfer.code) {
        const srcResult = await this.currencyService.toBase(
          tenantId,
          dto.amount,
          baseCurrencyForTransfer.id,
          dto.date,
        );
        sourceAmountBase = srcResult.amount;
        sourceRate = srcResult.rate;
      }

      // Calculate destination amount (convert source amount to destination currency)
      let destAmount = dto.amount;
      let destRate = sourceRate;

      const sourceCurrency = String(sourceData.currency);
      const destCurrency = String(destData.currency);

      if (sourceCurrency !== destCurrency) {
        // Convert via base: amount_in_base → dest currency
        const base = await this.currencyService.getBaseCurrency(tenantId);
        destRate = await this.currencyService
          .getRate(
            tenantId,
            base.id as string,
            (destData as any).currencyId ?? destCurrency,
            dto.date,
          )
          .catch(() => 1);
        destAmount = this.currencyService.convert(sourceAmountBase, destRate);
      }

      const sharedReference = dto.reference ?? `TRF-${uuidv7()}`;

      // Deduct from source (rawQuery for atomicity)
      await this.accountsRepository.rawQuery(
        `UPDATE treasury_accounts
         SET "currentBalance" = "currentBalance" - :amount
         WHERE id = :accountId AND "tenantId" = :tenantId`,
        { amount: dto.amount, accountId: dto.sourceAccountId, tenantId },
        transaction,
      );

      // Add to destination
      await this.accountsRepository.rawQuery(
        `UPDATE treasury_accounts
         SET "currentBalance" = "currentBalance" + :amount
         WHERE id = :accountId AND "tenantId" = :tenantId`,
        { amount: destAmount, accountId: dto.destinationAccountId, tenantId },
        transaction,
      );

      // Create transferOut transaction
      const outTx = await this.transactionsRepository.create(
        {
          accountId: dto.sourceAccountId,
          type: TreasuryTransactionType.TRANSFER_OUT,
          amount: dto.amount,
          currency: sourceCurrency,
          exchangeRate: sourceRate,
          reference: sharedReference,
          date: dto.date,
          description: dto.description ?? null,
          isReconciled: false,
          reconciliationId: null,
          journalEntryId: null,
        } as any,
        { tenantId, transaction, auditContext },
      );

      // Create transferIn transaction linked to the out transaction
      const inTx = await this.transactionsRepository.create(
        {
          accountId: dto.destinationAccountId,
          type: TreasuryTransactionType.TRANSFER_IN,
          amount: destAmount,
          currency: destCurrency,
          exchangeRate: destRate,
          reference: sharedReference,
          date: dto.date,
          description: dto.description ?? null,
          isReconciled: false,
          reconciliationId: null,
          journalEntryId: null,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();

      // Auto-post journal entry (fire-and-forget)
      this.postTransferJournalEntry(tenantId, outTx, inTx, sourceAmountBase, auditContext).catch(
        (err) =>
          this.logger.error(
            `Journal posting failed for transfer out=${(outTx as any).id}: ${err?.message}`,
          ),
      );

      return { outTransaction: outTx, inTransaction: inTx };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── List transactions for an account ───────────────────────────────────────

  async findByAccount(tenantId: string, accountId: string, pagination: PaginationDto) {
    // Validate account belongs to tenant
    const account = await this.accountsRepository.findOne({
      tenantId,
      where: { id: accountId },
    });
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, accountId));
    }

    return this.transactionsRepository.findAll({
      tenantId,
      where: { accountId },
      page: pagination.page,
      limit: pagination.limit,
      sortBy: 'date',
      sortOrder: pagination.sortOrder,
    });
  }

  // ── Statement with running balance ─────────────────────────────────────────

  async getStatement(tenantId: string, accountId: string, pagination: PaginationDto) {
    // Validate account belongs to tenant
    const account = await this.accountsRepository.findOne({
      tenantId,
      where: { id: accountId },
    });
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, accountId));
    }

    const offset = ((pagination.page ?? 1) - 1) * (pagination.limit ?? 20);
    const limit = pagination.limit ?? 20;

    const rows = await this.transactionsRepository.rawQuery<Record<string, unknown>[]>(
      `SELECT
        t.*,
        SUM(
          CASE WHEN t.type IN ('receipt', 'transferIn', 'openingBalance') THEN t.amount
               ELSE -t.amount END
        ) OVER (PARTITION BY t."accountId" ORDER BY t.date, t."createdAt") AS "runningBalance"
       FROM treasury_transactions t
       WHERE t."accountId" = :accountId
         AND t."tenantId" = :tenantId
         AND t."deletedAt" IS NULL
       ORDER BY t.date, t."createdAt"
       LIMIT :limit OFFSET :offset`,
      { accountId, tenantId, limit, offset },
    );

    const totalRow = await this.transactionsRepository.rawQuery<{ count: string }[]>(
      `SELECT COUNT(*) as count FROM treasury_transactions
       WHERE "accountId" = :accountId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { accountId, tenantId },
    );
    const total = parseInt(String(totalRow?.[0]?.count ?? 0), 10);

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

  // ── Get single transaction ──────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const tx = await this.transactionsRepository.findOne({ tenantId, where: { id } });
    if (!tx) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'TreasuryTransaction', id));
    }
    return tx;
  }

  // ── Private: journal posting helpers ───────────────────────────────────────

  private async postJournalEntry(
    tenantId: string,
    txRecord: unknown,
    accountData: Record<string, unknown>,
    amount: number,
    amountBase: number,
    exchangeRate: number,
    auditContext: AuditContext,
  ) {
    try {
      const tx = txRecord as Record<string, unknown>;
      const txType = String(tx.type ?? '');
      const isReceipt =
        txType === TreasuryTransactionType.RECEIPT ||
        txType === TreasuryTransactionType.OPENING_BALANCE;

      const postData = {
        entryDate: String(tx.date ?? new Date().toISOString().split('T')[0]),
        amount: amountBase,
        description: String(
          tx.description ?? (isReceipt ? 'Treasury Receipt' : 'Treasury Payment'),
        ),
        referenceId: String(tx.id ?? ''),
        referenceType: isReceipt ? 'treasury_receipt' : 'treasury_payment',
        currencyCode: String(accountData.currency ?? 'SAR'),
      };

      if (isReceipt) {
        await this.journalPoster.postTreasuryReceipt(tenantId, postData, auditContext);
      } else {
        await this.journalPoster.postTreasuryPayment(tenantId, postData, auditContext);
      }
    } catch (err: unknown) {
      this.logger.error(`Journal posting failed for treasury tx: ${(err as Error)?.message}`);
    }
  }

  private async postTransferJournalEntry(
    tenantId: string,
    outTx: unknown,
    inTx: unknown,
    amountBase: number,
    auditContext: AuditContext,
  ) {
    try {
      const out = outTx as Record<string, unknown>;
      await this.journalPoster.postTreasuryPayment(
        tenantId,
        {
          entryDate: String(out.date ?? new Date().toISOString().split('T')[0]),
          amount: amountBase,
          description: 'Treasury Transfer',
          referenceId: String(out.id ?? ''),
          referenceType: 'treasury_transfer',
        },
        auditContext,
      );
    } catch (err: unknown) {
      this.logger.error(`Journal posting failed for treasury transfer: ${(err as Error)?.message}`);
    }
  }
}
