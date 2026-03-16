import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JournalEntry } from '@/database/sql/entities/journal-entry.entity';
import { JournalLine } from '@/database/sql/entities/journal-line.entity';
import { FiscalPeriod } from '@/database/sql/entities/fiscal-period.entity';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { JournalEntryStatus, FiscalPeriodStatus } from '@/common/enums/accounting.enums';

export interface GenericJournalPostData {
  entryDate: string;
  description: string;
  referenceId: string | null;
  referenceType: string;
  branchId?: string;
  journalId?: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    label?: string;
    description?: string;
    currencyId?: string;
    amountCurrency?: number;
  }>;
}

export interface PosOrderPostData {
  entryDate: string;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  branchId: string;
}

export interface PayrollPostData {
  entryDate: string;
  payrollRunNumber: string;
  netSalaries: number;
  gosiEmployerAmount: number;
  gosiEmployeeAmount: number;
  branchId?: string;
  [key: string]: any;
}

export interface TreasuryPostData {
  entryDate: string;
  amount: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  branchId?: string;
  currencyId?: string;
  currencyCode?: string;
  [key: string]: any;
}

@Injectable()
export class JournalPosterSharedService {
  private readonly logger = new Logger(JournalPosterSharedService.name);

  constructor(
    @InjectRepository(JournalEntry) private readonly entryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine) private readonly lineRepo: Repository<JournalLine>,
    @InjectRepository(FiscalPeriod) private readonly periodRepo: Repository<FiscalPeriod>,
    private readonly dataSource: DataSource,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {}

  /**
   * Generic journal entry poster.
   */
  async post(
    _tenantId: string,
    data: GenericJournalPostData,
    auditContext: AuditContext,
    ..._rest: any[]
  ): Promise<void> {
    await this.createAndPostEntry(
      data.branchId,
      data.journalId,
      data.entryDate,
      data.description,
      data.referenceId,
      data.referenceType,
      data.lines,
      auditContext,
    );
  }

  async postPosOrder(
    tenantId: string,
    orderId: string,
    data: PosOrderPostData,
    auditContext: AuditContext,
    ..._rest: any[]
  ): Promise<void> {
    const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
    const salesAccountId = await this.requireSetting(tenantId, 'coaSalesRevenue');
    const vatAccountId = await this.requireSetting(tenantId, 'coaVatPayable');
    const journalId = await this.requireSetting(tenantId, 'posJournal');

    const lines: GenericJournalPostData['lines'] = [
      { accountId: cashAccountId, debit: data.totalAmount, credit: 0 },
      { accountId: salesAccountId, debit: 0, credit: data.subtotal },
    ];
    if (data.taxAmount > 0) {
      lines.push({ accountId: vatAccountId, debit: 0, credit: data.taxAmount });
    }

    await this.createAndPostEntry(
      data.branchId,
      journalId,
      data.entryDate,
      `POS Order ${data.orderNumber}`,
      orderId,
      'pos_order',
      lines,
      auditContext,
    );
  }

  async postPayroll(
    tenantId: string,
    payrollRunId: string,
    data: PayrollPostData,
    auditContext: AuditContext,
    ..._rest: any[]
  ): Promise<void> {
    const salariesExpenseId = await this.requireSetting(tenantId, 'coaSalariesExpense');
    const gosiExpenseId = await this.requireSetting(tenantId, 'coaGosiExpense');
    const salariesPayableId = await this.requireSetting(tenantId, 'coaSalariesPayable');
    const gosiPayableId = await this.requireSetting(tenantId, 'coaGosiPayable');
    const journalId = await this.requireSetting(tenantId, 'payrollJournal');

    await this.createAndPostEntry(
      data.branchId,
      journalId,
      data.entryDate,
      `Payroll Run ${data.payrollRunNumber}`,
      payrollRunId,
      'payroll_run',
      [
        { accountId: salariesExpenseId, debit: data.netSalaries, credit: 0 },
        { accountId: gosiExpenseId, debit: data.gosiEmployerAmount, credit: 0 },
        {
          accountId: salariesPayableId,
          debit: 0,
          credit: data.netSalaries - data.gosiEmployeeAmount,
        },
        {
          accountId: gosiPayableId,
          debit: 0,
          credit: data.gosiEmployerAmount + data.gosiEmployeeAmount,
        },
      ],
      auditContext,
    );
  }

  async postTreasuryReceipt(
    tenantId: string,
    data: TreasuryPostData,
    auditContext: AuditContext,
    ..._rest: any[]
  ): Promise<void> {
    const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
    const arAccountId = await this.requireSetting(tenantId, 'coaAccountsReceivable');
    const journalId = await this.requireSetting(tenantId, 'bankJournal');

    await this.createAndPostEntry(
      data.branchId,
      journalId,
      data.entryDate,
      data.description ?? 'Treasury Receipt',
      data.referenceId ?? null,
      data.referenceType ?? 'treasury_receipt',
      [
        { accountId: cashAccountId, debit: data.amount, credit: 0 },
        { accountId: arAccountId, debit: 0, credit: data.amount },
      ],
      auditContext,
    );
  }

  async postTreasuryPayment(
    tenantId: string,
    data: TreasuryPostData,
    auditContext: AuditContext,
    ..._rest: any[]
  ): Promise<void> {
    const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
    const apAccountId = await this.requireSetting(tenantId, 'coaAccountsPayable');
    const journalId = await this.requireSetting(tenantId, 'bankJournal');

    await this.createAndPostEntry(
      data.branchId,
      journalId,
      data.entryDate,
      data.description ?? 'Treasury Payment',
      data.referenceId ?? null,
      data.referenceType ?? 'treasury_payment',
      [
        { accountId: apAccountId, debit: data.amount, credit: 0 },
        { accountId: cashAccountId, debit: 0, credit: data.amount },
      ],
      auditContext,
    );
  }

  // ── Core ─────────────────────────────────────────────────────────────────

  private async createAndPostEntry(
    branchId: string | undefined,
    journalId: string | undefined,
    entryDate: string,
    description: string,
    referenceId: string | null,
    referenceType: string,
    lines: GenericJournalPostData['lines'],
    auditContext: AuditContext,
  ): Promise<void> {
    const period = await this.resolvePeriod(entryDate);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
      const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);

      const entry = qr.manager.create(JournalEntry, {
        branchId,
        journalId,
        date: entryDate,
        reference: description,
        narration: description,
        status: JournalEntryStatus.POSTED,
        totalDebit,
        totalCredit,
        sourceModel: referenceType,
        sourceId: referenceId ?? undefined,
        createdBy: auditContext.userId ?? null,
      } as Partial<JournalEntry> as any);
      const savedEntry = await qr.manager.save(JournalEntry, entry);

      const lineEntities = lines.map((l, idx) =>
        qr.manager.create(JournalLine, {
          journalEntryId: savedEntry.id,
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          label: l.label ?? description,
          currencyId: l.currencyId ?? null,
          amountCurrency: l.amountCurrency ?? null,
          sequence: idx,
          createdBy: auditContext.userId ?? null,
        } as Partial<JournalLine> as any),
      );
      await qr.manager.save(JournalLine, lineEntities);

      await qr.commitTransaction();
      this.logger.log(`Posted ${referenceType} journal entry ${savedEntry.id}`);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  private async resolvePeriod(date: string): Promise<FiscalPeriod> {
    const d = new Date(date);
    const period = await this.periodRepo
      .createQueryBuilder('fp')
      .where('fp.deleted_at IS NULL')
      .andWhere('fp.start_date <= :d', { d })
      .andWhere('fp.end_date >= :d', { d })
      .getOne();

    if (!period) {
      throw new BadRequestException({
        en: `No fiscal period found for date ${date}`,
        ar: `لا توجد فترة مالية للتاريخ ${date}`,
      });
    }
    if (
      period.status === FiscalPeriodStatus.CLOSED ||
      period.status === FiscalPeriodStatus.LOCKED
    ) {
      throw new BadRequestException({
        en: `Fiscal period for ${date} is closed`,
        ar: `الفترة المالية للتاريخ ${date} مغلقة`,
      });
    }
    return period;
  }

  private async requireSetting(tenantId: string, key: string): Promise<string> {
    const value = await this.unifiedSettings.get(tenantId, key);
    if (!value) {
      throw new BadRequestException({
        en: `Accounting setting '${key}' is not configured`,
        ar: `إعداد المحاسبة '${key}' غير مهيأ`,
      });
    }
    return value;
  }
}
