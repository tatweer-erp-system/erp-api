import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';
import { JournalLinesRepository } from '@/database/sql/repositories/journal-lines.repository';
import { FiscalPeriodsRepository } from '@/database/sql/repositories/fiscal-periods.repository';
import { JournalsRepository } from '@/database/sql/repositories/journals.repository';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { JournalEntryType, FiscalPeriodStatus } from '@/common/enums/accounting.enums';
import { JournalEntryTypeNew, JournalType } from '@/common/enums/accounting-new.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

export interface GenericJournalPostData {
  entryDate: string;
  description: string;
  referenceId: string | null;
  referenceType: string;
  /** Optional: journal type to use. Falls back to GENERAL if not specified. */
  journalType?: JournalType;
  /** Optional: granular entry type for the new classification. */
  entryTypeNew?: JournalEntryTypeNew;
  /** Optional: partner ID for AR/AP lines */
  partnerId?: string | null;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    currencyCode?: string;
    currencyId?: string | null;
    amountCurrency?: number | null;
    exchangeRate?: number;
    partnerId?: string | null;
    costCenterId?: string | null;
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

export interface SalesInvoicePostData {
  entryDate: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  partnerId: string;
  referenceId: string;
  referenceType: string;
  /** Override AR account — uses partner's AR or default if null */
  arAccountId?: string;
  /** Override revenue account */
  revenueAccountId?: string;
  /** Override VAT account */
  vatAccountId?: string;
}

export interface PurchaseBillPostData {
  entryDate: string;
  billNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  partnerId: string;
  referenceId: string;
  referenceType: string;
  /** Override AP account */
  apAccountId?: string;
  /** Override expense/inventory account */
  expenseAccountId?: string;
  /** Whether to track input VAT separately */
  trackInputVat?: boolean;
}

export interface StockMovementPostData {
  entryDate: string;
  description: string;
  referenceId: string;
  referenceType: string;
  inventoryAccountId: string;
  counterAccountId: string;
  amount: number;
}

@Injectable()
export class JournalPosterSharedService {
  private readonly logger = new Logger(JournalPosterSharedService.name);

  constructor(
    private readonly journalEntriesRepository: JournalEntriesRepository,
    private readonly journalLinesRepository: JournalLinesRepository,
    private readonly fiscalPeriodsRepository: FiscalPeriodsRepository,
    private readonly journalsRepository: JournalsRepository,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {}

  /**
   * Generic journal entry poster — used by cross-module wiring (sales, purchasing, inventory).
   * Accepts arbitrary debit/credit lines with account IDs already resolved by the caller.
   * Now resolves journal by type from the journals table.
   */
  async post(
    tenantId: string,
    data: GenericJournalPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const journalType = data.journalType ?? JournalType.GENERAL;
    const entryTypeNew = data.entryTypeNew ?? JournalEntryTypeNew.MANUAL;

    const lines = data.lines.map((l) => ({
      accountId: l.accountId,
      partnerId: l.partnerId ?? data.partnerId ?? null,
      costCenterId: l.costCenterId ?? null,
      debit: l.debit,
      credit: l.credit,
      description: l.description ?? null,
      currencyCode: l.currencyCode ?? 'SAR',
      currencyId: l.currencyId ?? null,
      amountCurrency: l.amountCurrency ?? null,
      exchangeRate: l.exchangeRate ?? 1,
    }));

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      data.description,
      data.referenceId,
      data.referenceType,
      journalType,
      entryTypeNew,
      lines,
      auditContext,
      containerTransaction,
    );
  }

  /**
   * Post a POS order — uses sale journal.
   * DR Cash, CR Sales Revenue, CR VAT Payable.
   */
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
      partnerId: string | null;
      costCenterId: string | null;
      debit: number;
      credit: number;
      description: string | null;
      currencyCode: string;
      currencyId: string | null;
      amountCurrency: number | null;
      exchangeRate: number;
    }> = [
      {
        accountId: cashAccountId,
        partnerId: null,
        costCenterId: null,
        debit: data.totalAmount,
        credit: 0,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
      {
        accountId: salesAccountId,
        partnerId: null,
        costCenterId: null,
        debit: 0,
        credit: data.subtotal,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
    ];
    if (data.taxAmount > 0) {
      lines.push({
        accountId: vatAccountId,
        partnerId: null,
        costCenterId: null,
        debit: 0,
        credit: data.taxAmount,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      });
    }

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      `POS Order ${data.orderNumber}`,
      orderId,
      'pos_order',
      JournalType.SALE,
      JournalEntryTypeNew.PAYMENT,
      lines,
      auditContext,
      containerTransaction,
    );
  }

  /**
   * Post a sales invoice — uses sale journal.
   * DR Accounts Receivable (with partner), CR Sales Revenue, CR VAT Payable.
   */
  async postSalesInvoice(
    tenantId: string,
    data: SalesInvoicePostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const arAccountId =
      data.arAccountId ?? (await this.requireSetting(tenantId, 'coaAccountsReceivable'));
    const revenueAccountId =
      data.revenueAccountId ?? (await this.requireSetting(tenantId, 'coaSalesRevenue'));
    const vatAccountId =
      data.vatAccountId ?? (await this.requireSetting(tenantId, 'coaVatPayable'));

    const lines: Array<{
      accountId: string;
      partnerId: string | null;
      costCenterId: string | null;
      debit: number;
      credit: number;
      description: string | null;
      currencyCode: string;
      currencyId: string | null;
      amountCurrency: number | null;
      exchangeRate: number;
    }> = [
      {
        accountId: arAccountId,
        partnerId: data.partnerId,
        costCenterId: null,
        debit: data.totalAmount,
        credit: 0,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
      {
        accountId: revenueAccountId,
        partnerId: null,
        costCenterId: null,
        debit: 0,
        credit: data.subtotal,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
    ];

    if (data.taxAmount > 0) {
      lines.push({
        accountId: vatAccountId,
        partnerId: null,
        costCenterId: null,
        debit: 0,
        credit: data.taxAmount,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      });
    }

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      `Sales Invoice ${data.invoiceNumber}`,
      data.referenceId,
      data.referenceType,
      JournalType.SALE,
      JournalEntryTypeNew.INVOICE,
      lines,
      auditContext,
      containerTransaction,
    );
  }

  /**
   * Post a purchase bill — uses purchase journal.
   * DR Inventory/Expense (+ DR Input VAT if tracked), CR Accounts Payable.
   */
  async postPurchaseBill(
    tenantId: string,
    data: PurchaseBillPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const apAccountId =
      data.apAccountId ?? (await this.requireSetting(tenantId, 'coaAccountsPayable'));
    const expenseAccountId =
      data.expenseAccountId ?? (await this.requireSetting(tenantId, 'coaInventory'));

    const lines: Array<{
      accountId: string;
      partnerId: string | null;
      costCenterId: string | null;
      debit: number;
      credit: number;
      description: string | null;
      currencyCode: string;
      currencyId: string | null;
      amountCurrency: number | null;
      exchangeRate: number;
    }> = [];

    if (data.trackInputVat && data.taxAmount > 0) {
      // Separate input VAT tracking
      const inputVatAccountId = await this.requireSetting(tenantId, 'coaInputVat');
      lines.push(
        {
          accountId: expenseAccountId,
          partnerId: null,
          costCenterId: null,
          debit: data.subtotal,
          credit: 0,
          description: null,
          currencyCode: 'SAR',
          currencyId: null,
          amountCurrency: null,
          exchangeRate: 1,
        },
        {
          accountId: inputVatAccountId,
          partnerId: null,
          costCenterId: null,
          debit: data.taxAmount,
          credit: 0,
          description: null,
          currencyCode: 'SAR',
          currencyId: null,
          amountCurrency: null,
          exchangeRate: 1,
        },
      );
    } else {
      // Full amount to expense/inventory (including tax)
      lines.push({
        accountId: expenseAccountId,
        partnerId: null,
        costCenterId: null,
        debit: data.totalAmount,
        credit: 0,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      });
    }

    lines.push({
      accountId: apAccountId,
      partnerId: data.partnerId,
      costCenterId: null,
      debit: 0,
      credit: data.totalAmount,
      description: null,
      currencyCode: 'SAR',
      currencyId: null,
      amountCurrency: null,
      exchangeRate: 1,
    });

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      `Purchase Bill ${data.billNumber}`,
      data.referenceId,
      data.referenceType,
      JournalType.PURCHASE,
      JournalEntryTypeNew.INVOICE,
      lines,
      auditContext,
      containerTransaction,
    );
  }

  /**
   * Post a stock movement — uses stock journal (falls back to general).
   * DR/CR inventory accounts.
   */
  async postStockMovement(
    tenantId: string,
    data: StockMovementPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const lines = [
      {
        accountId: data.inventoryAccountId,
        partnerId: null,
        costCenterId: null,
        debit: data.amount,
        credit: 0,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
      {
        accountId: data.counterAccountId,
        partnerId: null,
        costCenterId: null,
        debit: 0,
        credit: data.amount,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
    ];

    // Try stock journal type — not all tenants may have one, fall back to general
    let journalType = JournalType.GENERAL;
    const stockJournal = await this.journalsRepository.findByType(tenantId, JournalType.GENERAL);
    if (stockJournal) {
      journalType = JournalType.GENERAL;
    }

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      data.description,
      data.referenceId,
      data.referenceType,
      journalType,
      JournalEntryTypeNew.STOCK,
      lines,
      auditContext,
      containerTransaction,
    );
  }

  /**
   * Post payroll — uses general journal.
   * DR Salary Expense, DR GOSI Expense, CR Salaries Payable, CR GOSI Payable.
   */
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
        partnerId: null,
        costCenterId: null,
        debit: data.netSalaries,
        credit: 0,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
      {
        accountId: gosiExpenseId,
        partnerId: null,
        costCenterId: null,
        debit: data.gosiEmployerAmount,
        credit: 0,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
      {
        accountId: salariesPayableId,
        partnerId: null,
        costCenterId: null,
        debit: 0,
        credit: data.netSalaries - data.gosiEmployeeAmount,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
      {
        accountId: gosiPayableId,
        partnerId: null,
        costCenterId: null,
        debit: 0,
        credit: data.gosiEmployerAmount + data.gosiEmployeeAmount,
        description: null,
        currencyCode: 'SAR',
        currencyId: null,
        amountCurrency: null,
        exchangeRate: 1,
      },
    ];

    await this.createAndPostEntry(
      tenantId,
      data.entryDate,
      `Payroll Run ${data.payrollRunNumber}`,
      payrollRunId,
      'payroll_run',
      JournalType.GENERAL,
      JournalEntryTypeNew.PAYROLL,
      lines,
      auditContext,
      containerTransaction,
    );
  }

  /**
   * Post treasury receipt — uses cash/bank journal based on treasury account type.
   * DR Cash/Bank, CR Accounts Receivable.
   */
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
      JournalType.CASH,
      JournalEntryTypeNew.PAYMENT,
      [
        {
          accountId: cashAccountId,
          partnerId: null,
          costCenterId: null,
          debit: data.amount,
          credit: 0,
          description: null,
          currencyCode: cc,
          currencyId: null,
          amountCurrency: null,
          exchangeRate: 1,
        },
        {
          accountId: arAccountId,
          partnerId: null,
          costCenterId: null,
          debit: 0,
          credit: data.amount,
          description: null,
          currencyCode: cc,
          currencyId: null,
          amountCurrency: null,
          exchangeRate: 1,
        },
      ],
      auditContext,
      containerTransaction,
    );
  }

  /**
   * Post treasury payment — uses cash/bank journal.
   * DR Accounts Payable, CR Cash/Bank.
   */
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
      JournalType.CASH,
      JournalEntryTypeNew.PAYMENT,
      [
        {
          accountId: apAccountId,
          partnerId: null,
          costCenterId: null,
          debit: data.amount,
          credit: 0,
          description: null,
          currencyCode: cc,
          currencyId: null,
          amountCurrency: null,
          exchangeRate: 1,
        },
        {
          accountId: cashAccountId,
          partnerId: null,
          costCenterId: null,
          debit: 0,
          credit: data.amount,
          description: null,
          currencyCode: cc,
          currencyId: null,
          amountCurrency: null,
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
    journalType: JournalType,
    entryTypeNew: JournalEntryTypeNew,
    lines: Array<{
      accountId: string;
      partnerId: string | null;
      costCenterId: string | null;
      debit: number;
      credit: number;
      description: string | null;
      currencyCode: string;
      currencyId: string | null;
      amountCurrency: number | null;
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
      // Validate fiscal lock date
      await this.validateFiscalLockDate(tenantId, entryDate);

      const period = await this.resolvePeriod(tenantId, entryDate, transaction);
      const periodId = (period as any).id;

      // Resolve journal by type — gracefully fall back to null if no journal configured
      const journal = await this.journalsRepository.findByType(tenantId, journalType, transaction);
      let journalId: string | null = null;
      let sequencePrefix: string | null = null;

      if (journal) {
        const journalRecord = journal as unknown as Record<string, unknown>;
        journalId = journalRecord.id as string;
        sequencePrefix = journalRecord.sequencePrefix as string | null;
      } else {
        // Fall back to general journal if specific type not found
        if (journalType !== JournalType.GENERAL) {
          const generalJournal = await this.journalsRepository.findByType(
            tenantId,
            JournalType.GENERAL,
            transaction,
          );
          if (generalJournal) {
            const gjRecord = generalJournal as unknown as Record<string, unknown>;
            journalId = gjRecord.id as string;
            sequencePrefix = gjRecord.sequencePrefix as string | null;
          }
        }
        // If no journal at all — still proceed (backward compatible, journalId stays null)
      }

      const entryNumber = await this.journalEntriesRepository.nextEntryNumberForJournal(
        tenantId,
        sequencePrefix,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          entryDate,
          entryType: JournalEntryType.AUTO,
          entryTypeNew,
          journalId,
          description,
          referenceId,
          referenceType,
          isPosted: true,
          isReversed: false,
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

  private async validateFiscalLockDate(tenantId: string, entryDate: string): Promise<void> {
    const lockDate = await this.unifiedSettings.get(tenantId, 'fiscalLockDate');
    if (lockDate && entryDate <= lockDate) {
      throw new BadRequestException(
        msg(ErrorMessages.FISCAL_LOCK_DATE_VIOLATION, entryDate, lockDate),
      );
    }
  }

  private async requireSetting(tenantId: string, key: string): Promise<string> {
    const value = await this.unifiedSettings.get(tenantId, key);
    if (!value) {
      throw new BadRequestException(msg(ErrorMessages.ACCOUNTING_SETTING_MISSING, key));
    }
    return value;
  }
}
