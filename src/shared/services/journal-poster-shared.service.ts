import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';
import { JournalLinesRepository } from '@/database/sql/repositories/journal-lines.repository';
import { FiscalPeriodsRepository } from '@/database/sql/repositories/fiscal-periods.repository';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { JournalEntryType, FiscalPeriodStatus } from '@/common/enums/accounting.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

export interface GenericJournalPostData {
  entryDate: string;
  description: string;
  referenceId: string | null;
  referenceType: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    currencyCode?: string;
    exchangeRate?: number;
  }>;
}

export interface PosOrderPostData {
  entryDate: string;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
}

export interface PayrollPostData {
  entryDate: string;
  payrollRunNumber: string;
  netSalaries: number;
  gosiEmployerAmount: number;
  gosiEmployeeAmount: number;
}

export interface TreasuryPostData {
  entryDate: string;
  amount: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  currencyCode?: string;
}

@Injectable()
export class JournalPosterSharedService {
  private readonly logger = new Logger(JournalPosterSharedService.name);

  constructor(
    private readonly journalEntriesRepository: JournalEntriesRepository,
    private readonly journalLinesRepository: JournalLinesRepository,
    private readonly fiscalPeriodsRepository: FiscalPeriodsRepository,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {}

  /**
   * Generic journal entry poster — used by cross-module wiring (sales, purchasing, inventory).
   * Accepts arbitrary debit/credit lines with account IDs already resolved by the caller.
   */
  async post(
    tenantId: string,
    data: GenericJournalPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const lines = data.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      currencyCode: l.currencyCode ?? 'SAR',
      exchangeRate: l.exchangeRate ?? 1,
    }));

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      data.description,
      data.referenceId,
      data.referenceType,
      lines,
      auditContext,
      containerTransaction,
    );
  }

  async postPosOrder(
    tenantId: string,
    orderId: string,
    data: PosOrderPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
    const salesAccountId = await this.requireSetting(tenantId, 'coaSalesRevenue');
    const vatAccountId = await this.requireSetting(tenantId, 'coaVatPayable');

    const lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      currencyCode: string;
      exchangeRate: number;
    }> = [
      {
        accountId: cashAccountId,
        debit: data.totalAmount,
        credit: 0,
        currencyCode: 'SAR',
        exchangeRate: 1,
      },
      {
        accountId: salesAccountId,
        debit: 0,
        credit: data.subtotal,
        currencyCode: 'SAR',
        exchangeRate: 1,
      },
    ];
    if (data.taxAmount > 0) {
      lines.push({
        accountId: vatAccountId,
        debit: 0,
        credit: data.taxAmount,
        currencyCode: 'SAR',
        exchangeRate: 1,
      });
    }

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      `POS Order ${data.orderNumber}`,
      orderId,
      'pos_order',
      lines,
      auditContext,
      containerTransaction,
    );
  }

  async postPayroll(
    tenantId: string,
    payrollRunId: string,
    data: PayrollPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const salariesExpenseId = await this.requireSetting(tenantId, 'coaSalariesExpense');
    const gosiExpenseId = await this.requireSetting(tenantId, 'coaGosiExpense');
    const salariesPayableId = await this.requireSetting(tenantId, 'coaSalariesPayable');
    const gosiPayableId = await this.requireSetting(tenantId, 'coaGosiPayable');

    const lines = [
      {
        accountId: salariesExpenseId,
        debit: data.netSalaries,
        credit: 0,
        currencyCode: 'SAR',
        exchangeRate: 1,
      },
      {
        accountId: gosiExpenseId,
        debit: data.gosiEmployerAmount,
        credit: 0,
        currencyCode: 'SAR',
        exchangeRate: 1,
      },
      {
        accountId: salariesPayableId,
        debit: 0,
        credit: data.netSalaries - data.gosiEmployeeAmount,
        currencyCode: 'SAR',
        exchangeRate: 1,
      },
      {
        accountId: gosiPayableId,
        debit: 0,
        credit: data.gosiEmployerAmount + data.gosiEmployeeAmount,
        currencyCode: 'SAR',
        exchangeRate: 1,
      },
    ];

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      `Payroll Run ${data.payrollRunNumber}`,
      payrollRunId,
      'payroll_run',
      lines,
      auditContext,
      containerTransaction,
    );
  }

  async postTreasuryReceipt(
    tenantId: string,
    data: TreasuryPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
    const arAccountId = await this.requireSetting(tenantId, 'coaAccountsReceivable');
    const cc = data.currencyCode ?? 'SAR';

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      data.description ?? 'Treasury Receipt',
      data.referenceId ?? null,
      data.referenceType ?? 'treasury_receipt',
      [
        {
          accountId: cashAccountId,
          debit: data.amount,
          credit: 0,
          currencyCode: cc,
          exchangeRate: 1,
        },
        {
          accountId: arAccountId,
          debit: 0,
          credit: data.amount,
          currencyCode: cc,
          exchangeRate: 1,
        },
      ],
      auditContext,
      containerTransaction,
    );
  }

  async postTreasuryPayment(
    tenantId: string,
    data: TreasuryPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
    const apAccountId = await this.requireSetting(tenantId, 'coaAccountsPayable');
    const cc = data.currencyCode ?? 'SAR';

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      data.description ?? 'Treasury Payment',
      data.referenceId ?? null,
      data.referenceType ?? 'treasury_payment',
      [
        {
          accountId: apAccountId,
          debit: data.amount,
          credit: 0,
          currencyCode: cc,
          exchangeRate: 1,
        },
        {
          accountId: cashAccountId,
          debit: 0,
          credit: data.amount,
          currencyCode: cc,
          exchangeRate: 1,
        },
      ],
      auditContext,
      containerTransaction,
    );
  }

  // ── Core ─────────────────────────────────────────────────────────────────

  private async createAndPostEntry(
    tenantId: string,
    entryDate: string,
    description: string,
    referenceId: string | null,
    referenceType: string,
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      currencyCode: string;
      exchangeRate: number;
    }>,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const period = await this.resolvePeriod(tenantId, entryDate, transaction);
      const periodId = (period as any).id;

      const entryNumber = await this.journalEntriesRepository.nextEntryNumber(
        tenantId,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          entryDate,
          entryType: JournalEntryType.AUTO,
          description,
          referenceId,
          referenceType,
          isPosted: true,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const entryId = (entry as unknown as Record<string, unknown>).id as string;
      await this.journalLinesRepository.bulkInsertLines(entryId, lines, transaction);

      if (isOwner) await transaction.commit();
      this.logger.log(`Posted ${referenceType} journal ${entryNumber} for tenant ${tenantId}`);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  private async resolvePeriod(tenantId: string, date: string, transaction?: Transaction) {
    const period = await this.fiscalPeriodsRepository.findPeriodForDate(
      tenantId,
      date,
      transaction,
    );
    if (!period) {
      throw new BadRequestException(msg(ErrorMessages.PERIOD_NOT_FOUND, date));
    }
    const status = (period as any).status;
    if (status === FiscalPeriodStatus.CLOSED || status === FiscalPeriodStatus.LOCKED) {
      throw new BadRequestException(msg(ErrorMessages.PERIOD_CLOSED, date));
    }
    return period;
  }

  private async requireSetting(tenantId: string, key: string): Promise<string> {
    const value = await this.unifiedSettings.get(tenantId, key);
    if (!value) {
      throw new BadRequestException(msg(ErrorMessages.ACCOUNTING_SETTING_MISSING, key));
    }
    return value;
  }
}
