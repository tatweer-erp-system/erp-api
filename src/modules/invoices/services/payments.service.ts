import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { PaymentsNewRepository } from '@/database/sql/repositories/payments-new.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { FilterPaymentDto } from '../dto/filter-payment.dto';
import { PaymentStatusNew, PaymentTypeNew } from '@/common/enums/invoice.enums';
import { TreasuryTransactionType } from '@/common/enums/accounting.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';

const PAYMENT_TRANSITION_ENTITY = 'payment_new';
const PAYMENT_SEQUENCE_ENTITY = 'payment';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsNewRepository: PaymentsNewRepository,
    private readonly treasuryTransactionsRepository: TreasuryTransactionsRepository,
    private readonly treasuryAccountsRepository: TreasuryAccountsRepository,
    private readonly sequencesService: SequencesService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly journalPosterService: JournalPosterSharedService,
    private readonly auditService: AuditSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {
    this.statusTransitionService.registerTransitions(PAYMENT_TRANSITION_ENTITY, [
      { from: PaymentStatusNew.DRAFT, to: PaymentStatusNew.POSTED },
      { from: PaymentStatusNew.DRAFT, to: PaymentStatusNew.CANCELLED },
      { from: PaymentStatusNew.POSTED, to: PaymentStatusNew.CANCELLED },
    ]);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  async getSummary(tenantId: string, query: FilterPaymentDto) {
    return this.paymentsNewRepository.getSummary(tenantId, {
      paymentType: query.paymentType,
      status: query.status,
      partnerId: query.partnerId,
      branchId: query.branchId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: FilterPaymentDto) {
    const where: Record<string, unknown> = {};

    if (query.paymentType) where.paymentType = query.paymentType;
    if (query.status) where.status = query.status;
    if (query.partnerId) where.partnerId = query.partnerId;
    if (query.branchId) where.branchId = query.branchId;

    if (query.dateFrom || query.dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (query.dateFrom) dateFilter[Op.gte as unknown as string] = query.dateFrom;
      if (query.dateTo) dateFilter[Op.lte as unknown as string] = query.dateTo;
      where.paymentDate = dateFilter;
    }

    return this.paymentsNewRepository.findAll({
      tenantId,
      where,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['paymentNumber', 'memo'],
      sortBy: query.sortBy ?? 'paymentDate',
      sortOrder: query.sortOrder ?? 'DESC',
    });
  }

  // ── Single ───────────────────────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const payment = await this.paymentsNewRepository.findByIdOrNull(id, { tenantId });
    if (!payment) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Payment', id));
    return payment;
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    dto: CreatePaymentDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.paymentsNewRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const paymentNumber = await this.sequencesService.nextNumber(
        tenantId,
        PAYMENT_SEQUENCE_ENTITY,
        dto.branchId,
      );

      const exchangeRate = dto.exchangeRate ?? 1;
      const amountBase = Math.round(dto.amount * exchangeRate * 100) / 100;

      const payment = await this.paymentsNewRepository.create(
        {
          branchId: dto.branchId,
          partnerId: dto.partnerId,
          paymentType: dto.paymentType,
          status: PaymentStatusNew.DRAFT,
          paymentNumber,
          paymentDate: dto.paymentDate,
          amount: dto.amount,
          currencyId: dto.currencyId ?? null,
          exchangeRate,
          amountBase,
          memo: dto.memo ?? null,
          journalId: dto.journalId ?? null,
          treasuryAccountId: dto.treasuryAccountId ?? null,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const paymentRecord = payment as unknown as Record<string, unknown>;
      await this.auditService.logCreate(
        tenantId,
        'payment',
        paymentRecord.id as string,
        { paymentNumber, paymentType: dto.paymentType, amount: dto.amount },
        auditContext.userId,
      );

      if (isOwner) await transaction.commit();
      return payment;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Post ─────────────────────────────────────────────────────────────────────

  async post(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.paymentsNewRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.paymentsNewRepository.findByIdOrNull(id, {
        tenantId,
        transaction,
      });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Payment', id));

      const record = existing as unknown as Record<string, unknown>;
      this.statusTransitionService.validateOrThrow(
        PAYMENT_TRANSITION_ENTITY,
        record.status as string,
        PaymentStatusNew.POSTED,
      );

      const amount = parseFloat(String(record.amount));
      const paymentType = record.paymentType as PaymentTypeNew;
      const paymentNumber = record.paymentNumber as string;
      const paymentDate = record.paymentDate as string;
      const treasuryAccountId = record.treasuryAccountId as string | null;
      const partnerId = record.partnerId as string | null;

      // Determine journal entry lines
      const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
      const isInbound = paymentType === PaymentTypeNew.INBOUND;
      const counterpartKey = isInbound ? 'coaAccountsReceivable' : 'coaAccountsPayable';
      const counterpartAccountId = await this.requireSetting(tenantId, counterpartKey);

      const journalLines = isInbound
        ? [
            {
              accountId: cashAccountId,
              debit: amount,
              credit: 0,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
            {
              accountId: counterpartAccountId,
              debit: 0,
              credit: amount,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
          ]
        : [
            {
              accountId: counterpartAccountId,
              debit: amount,
              credit: 0,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
            {
              accountId: cashAccountId,
              debit: 0,
              credit: amount,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
          ];

      await this.journalPosterService.post(
        tenantId,
        {
          entryDate: paymentDate,
          description: `Payment ${paymentNumber}`,
          referenceId: id,
          referenceType: 'payment',
          lines: journalLines,
        },
        auditContext,
        transaction,
      );

      await this.paymentsNewRepository.update(id, { status: PaymentStatusNew.POSTED } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      // Create treasury transaction if a treasury account is linked
      if (treasuryAccountId) {
        await this.createTreasuryTransactionFromPayment(
          tenantId,
          {
            paymentId: id,
            treasuryAccountId,
            amount,
            paymentDate,
            paymentNumber,
            paymentType: isInbound ? 'inbound' : 'outbound',
            partnerId: partnerId ?? undefined,
            memo: record.memo as string | undefined,
          },
          auditContext,
          transaction,
        );
      }

      // Emit outbox event for payment posted
      await this.outboxService.createEvent(
        transaction,
        tenantId,
        'PAYMENT_RECEIVED',
        {
          paymentId: id,
          paymentNumber,
          paymentType,
          amount,
          partnerId,
          paymentDate,
        },
        id,
        'payment',
      );

      await this.auditService.logStatusChange(
        tenantId,
        'payment',
        id,
        PaymentStatusNew.DRAFT,
        PaymentStatusNew.POSTED,
        auditContext.userId,
      );

      if (isOwner) await transaction.commit();
      return this.paymentsNewRepository.findByIdOrNull(id, { tenantId });
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Cancel ───────────────────────────────────────────────────────────────────

  async cancel(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.paymentsNewRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.paymentsNewRepository.findByIdOrNull(id, {
        tenantId,
        transaction,
      });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Payment', id));

      const record = existing as unknown as Record<string, unknown>;
      const currentStatus = record.status as string;

      this.statusTransitionService.validateOrThrow(
        PAYMENT_TRANSITION_ENTITY,
        currentStatus,
        PaymentStatusNew.CANCELLED,
      );

      await this.paymentsNewRepository.update(id, { status: PaymentStatusNew.CANCELLED } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      await this.auditService.logStatusChange(
        tenantId,
        'payment',
        id,
        currentStatus,
        PaymentStatusNew.CANCELLED,
        auditContext.userId,
      );

      if (isOwner) await transaction.commit();
      return this.paymentsNewRepository.findByIdOrNull(id, { tenantId });
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Creates a treasury transaction when a payment is posted and linked
   * to a treasury account. Updates the treasury account balance atomically.
   */
  private async createTreasuryTransactionFromPayment(
    tenantId: string,
    paymentData: {
      paymentId: string;
      treasuryAccountId: string;
      amount: number;
      paymentDate: string;
      paymentNumber: string;
      paymentType: 'inbound' | 'outbound';
      partnerId?: string;
      memo?: string;
    },
    auditContext: AuditContext,
    containerTransaction: Transaction,
  ) {
    const isCredit = paymentData.paymentType === 'inbound';
    const type = isCredit ? TreasuryTransactionType.RECEIPT : TreasuryTransactionType.PAYMENT;

    // Verify account exists
    const account = await this.treasuryAccountsRepository.findOne({
      tenantId,
      where: { id: paymentData.treasuryAccountId },
      transaction: containerTransaction,
    });
    if (!account) {
      throw new BadRequestException(
        msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, paymentData.treasuryAccountId),
      );
    }
    const accountData = account as unknown as Record<string, unknown>;

    // For outbound, check sufficient balance
    if (!isCredit) {
      const currentBalance = parseFloat(String(accountData.currentBalance ?? 0));
      if (currentBalance < paymentData.amount) {
        throw new BadRequestException(
          msg(ErrorMessages.TREASURY_INSUFFICIENT_BALANCE, currentBalance, paymentData.amount),
        );
      }
    }

    // Atomic balance update
    const operator = isCredit ? '+' : '-';
    await this.treasuryAccountsRepository.rawQuery(
      `UPDATE treasury_accounts
       SET "currentBalance" = "currentBalance" ${operator} :amount
       WHERE id = :accountId AND "tenantId" = :tenantId`,
      { amount: paymentData.amount, accountId: paymentData.treasuryAccountId, tenantId },
      containerTransaction,
    );

    // Insert treasury transaction record
    await this.treasuryTransactionsRepository.create(
      {
        accountId: paymentData.treasuryAccountId,
        type,
        amount: paymentData.amount,
        currency: String(accountData.currency),
        exchangeRate: 1,
        reference: paymentData.paymentNumber,
        contactId: paymentData.partnerId ?? null,
        partnerId: paymentData.partnerId ?? null,
        date: paymentData.paymentDate,
        description: paymentData.memo ?? `Payment ${paymentData.paymentNumber}`,
        isReconciled: false,
        reconciliationId: null,
        journalEntryId: null,
        paymentId: paymentData.paymentId,
      } as any,
      { tenantId, transaction: containerTransaction, auditContext },
    );
  }

  private async requireSetting(tenantId: string, key: string): Promise<string> {
    const value = await this.unifiedSettings.get(tenantId, key);
    if (!value) {
      throw new BadRequestException(msg(ErrorMessages.ACCOUNTING_SETTING_MISSING, key));
    }
    return value;
  }
}
