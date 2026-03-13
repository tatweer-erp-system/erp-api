import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';
import { JournalLinesRepository } from '@/database/sql/repositories/journal-lines.repository';
import { SettingsRepository } from '@/database/sql/repositories/settings.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { JournalEntryType } from '@/common/enums/accounting.enums';
import { CurrencyService } from '@/modules/currency/currency.service';
import { FiscalPeriodsService } from './fiscal-periods.service';
import {
  PosOrderPostData,
  PayrollPostData,
  TreasuryReceiptData,
  TreasuryPaymentData,
  TreasuryTransferData,
} from '../interfaces/accounting.interfaces';

@Injectable()
export class JournalPosterService {
  private readonly logger = new Logger(JournalPosterService.name);

  constructor(
    private readonly journalEntriesRepository: JournalEntriesRepository,
    private readonly journalLinesRepository: JournalLinesRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly fiscalPeriodsService: FiscalPeriodsService,
    private readonly currencyService: CurrencyService,
  ) {}

  // ── POS Order ─────────────────────────────────────────────────────────────

  async postPosOrder(
    tenantId: string,
    orderId: string,
    orderData: PosOrderPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
      const salesAccountId = await this.requireSetting(tenantId, 'coaSalesRevenue');
      const vatAccountId = await this.requireSetting(tenantId, 'coaVatPayable');

      const period = await this.fiscalPeriodsService.resolvePeriod(
        tenantId,
        orderData.entryDate,
        transaction,
      );
      const periodRecord = period as unknown as Record<string, unknown>;

      const entryNumber = await this.journalEntriesRepository.nextEntryNumber(
        tenantId,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          date: orderData.entryDate,
          type: JournalEntryType.AUTO,
          description: `POS Order ${orderData.orderNumber}`,
          referenceId: orderId,
          referenceType: 'pos_order',
          isPosted: true,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId: periodRecord.id,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const entryId = (entry as unknown as Record<string, unknown>).id as string;

      const lines: Array<{
        accountId: string;
        debit: number;
        credit: number;
        currencyCode: string;
        exchangeRate: number;
      }> = [
        // Dr Cash (full total)
        {
          accountId: cashAccountId,
          debit: orderData.totalAmount,
          credit: 0,
          currencyCode: 'SAR',
          exchangeRate: 1,
        },
        // Cr Sales Revenue (subtotal without tax)
        {
          accountId: salesAccountId,
          debit: 0,
          credit: orderData.subtotal,
          currencyCode: 'SAR',
          exchangeRate: 1,
        },
      ];

      if (orderData.taxAmount > 0) {
        lines.push({
          accountId: vatAccountId,
          debit: 0,
          credit: orderData.taxAmount,
          currencyCode: 'SAR',
          exchangeRate: 1,
        });
      }

      await this.journalLinesRepository.bulkInsertLines(entryId, lines, transaction);

      if (isOwner) await transaction.commit();
      this.logger.log(
        `Posted POS order ${orderId} journal entry ${entryNumber} for tenant ${tenantId}`,
      );
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Payroll ───────────────────────────────────────────────────────────────

  async postPayroll(
    tenantId: string,
    payrollRunId: string,
    payrollData: PayrollPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const salariesExpenseId = await this.requireSetting(tenantId, 'coaSalariesExpense');
      const gosiExpenseId = await this.requireSetting(tenantId, 'coaGosiExpense');
      const salariesPayableId = await this.requireSetting(tenantId, 'coaSalariesPayable');
      const gosiPayableId = await this.requireSetting(tenantId, 'coaGosiPayable');

      const period = await this.fiscalPeriodsService.resolvePeriod(
        tenantId,
        payrollData.entryDate,
        transaction,
      );
      const periodRecord = period as unknown as Record<string, unknown>;

      const entryNumber = await this.journalEntriesRepository.nextEntryNumber(
        tenantId,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          date: payrollData.entryDate,
          type: JournalEntryType.AUTO,
          description: `Payroll Run ${payrollData.payrollRunNumber}`,
          referenceId: payrollRunId,
          referenceType: 'payroll_run',
          isPosted: true,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId: periodRecord.id,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const entryId = (entry as unknown as Record<string, unknown>).id as string;

      const lines = [
        // Dr Salaries Expense
        {
          accountId: salariesExpenseId,
          debit: payrollData.netSalaries,
          credit: 0,
          currencyCode: 'SAR',
          exchangeRate: 1,
        },
        // Dr GOSI Employer Expense
        {
          accountId: gosiExpenseId,
          debit: payrollData.gosiEmployerAmount,
          credit: 0,
          currencyCode: 'SAR',
          exchangeRate: 1,
        },
        // Cr Salaries Payable (net = gross - gosi employee)
        {
          accountId: salariesPayableId,
          debit: 0,
          credit: payrollData.netSalaries - payrollData.gosiEmployeeAmount,
          currencyCode: 'SAR',
          exchangeRate: 1,
        },
        // Cr GOSI Payable (employer + employee contribution)
        {
          accountId: gosiPayableId,
          debit: 0,
          credit: payrollData.gosiEmployerAmount + payrollData.gosiEmployeeAmount,
          currencyCode: 'SAR',
          exchangeRate: 1,
        },
      ];

      await this.journalLinesRepository.bulkInsertLines(entryId, lines, transaction);

      if (isOwner) await transaction.commit();
      this.logger.log(
        `Posted payroll run ${payrollRunId} journal entry ${entryNumber} for tenant ${tenantId}`,
      );
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Treasury Receipt ──────────────────────────────────────────────────────

  async postTreasuryReceipt(
    tenantId: string,
    txData: TreasuryReceiptData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
      const arAccountId = await this.requireSetting(tenantId, 'coaAccountsReceivable');

      const period = await this.fiscalPeriodsService.resolvePeriod(
        tenantId,
        txData.entryDate,
        transaction,
      );
      const periodRecord = period as unknown as Record<string, unknown>;

      const entryNumber = await this.journalEntriesRepository.nextEntryNumber(
        tenantId,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          date: txData.entryDate,
          type: JournalEntryType.AUTO,
          description: txData.description ?? 'Treasury Receipt',
          referenceId: txData.referenceId ?? null,
          referenceType: txData.referenceType ?? 'treasury_receipt',
          isPosted: true,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId: periodRecord.id,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const entryId = (entry as unknown as Record<string, unknown>).id as string;

      await this.journalLinesRepository.bulkInsertLines(
        entryId,
        [
          {
            accountId: cashAccountId,
            debit: txData.amount,
            credit: 0,
            currencyCode: txData.currencyCode ?? 'SAR',
            exchangeRate: 1,
          },
          {
            accountId: arAccountId,
            debit: 0,
            credit: txData.amount,
            currencyCode: txData.currencyCode ?? 'SAR',
            exchangeRate: 1,
          },
        ],
        transaction,
      );

      if (isOwner) await transaction.commit();
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Treasury Payment ──────────────────────────────────────────────────────

  async postTreasuryPayment(
    tenantId: string,
    txData: TreasuryPaymentData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
      const apAccountId = await this.requireSetting(tenantId, 'coaAccountsPayable');

      const period = await this.fiscalPeriodsService.resolvePeriod(
        tenantId,
        txData.entryDate,
        transaction,
      );
      const periodRecord = period as unknown as Record<string, unknown>;

      const entryNumber = await this.journalEntriesRepository.nextEntryNumber(
        tenantId,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          date: txData.entryDate,
          type: JournalEntryType.AUTO,
          description: txData.description ?? 'Treasury Payment',
          referenceId: txData.referenceId ?? null,
          referenceType: txData.referenceType ?? 'treasury_payment',
          isPosted: true,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId: periodRecord.id,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const entryId = (entry as unknown as Record<string, unknown>).id as string;

      await this.journalLinesRepository.bulkInsertLines(
        entryId,
        [
          {
            accountId: apAccountId,
            debit: txData.amount,
            credit: 0,
            currencyCode: txData.currencyCode ?? 'SAR',
            exchangeRate: 1,
          },
          {
            accountId: cashAccountId,
            debit: 0,
            credit: txData.amount,
            currencyCode: txData.currencyCode ?? 'SAR',
            exchangeRate: 1,
          },
        ],
        transaction,
      );

      if (isOwner) await transaction.commit();
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Treasury Transfer ─────────────────────────────────────────────────────

  async postTreasuryTransfer(
    tenantId: string,
    txData: TreasuryTransferData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<void> {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const cashAccountId = await this.requireSetting(tenantId, 'coaCash');

      const period = await this.fiscalPeriodsService.resolvePeriod(
        tenantId,
        txData.entryDate,
        transaction,
      );
      const periodRecord = period as unknown as Record<string, unknown>;

      const entryNumber = await this.journalEntriesRepository.nextEntryNumber(
        tenantId,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          date: txData.entryDate,
          type: JournalEntryType.AUTO,
          description: txData.description ?? 'Treasury Transfer',
          referenceId: txData.referenceId ?? null,
          referenceType: 'treasury_transfer',
          isPosted: true,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId: periodRecord.id,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const entryId = (entry as unknown as Record<string, unknown>).id as string;

      // Both sides are cash — in a real scenario one would use two different cash accounts
      await this.journalLinesRepository.bulkInsertLines(
        entryId,
        [
          {
            accountId: cashAccountId,
            debit: txData.amount,
            credit: 0,
            currencyCode: 'SAR',
            exchangeRate: 1,
          },
          {
            accountId: cashAccountId,
            debit: 0,
            credit: txData.amount,
            currencyCode: 'SAR',
            exchangeRate: 1,
          },
        ],
        transaction,
      );

      if (isOwner) await transaction.commit();
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async requireSetting(tenantId: string, key: string): Promise<string> {
    const setting = await this.settingsRepository.findByKeyTenant(tenantId, key);
    if (!setting?.value) {
      throw new BadRequestException(
        `Accounting setting "${key}" is not configured for this tenant. Please configure it in accounting settings.`,
      );
    }
    return setting.value as string;
  }
}
