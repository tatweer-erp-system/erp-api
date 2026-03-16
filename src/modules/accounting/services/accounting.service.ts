import { Injectable } from '@nestjs/common';
import { ChartOfAccountsRepository } from '@/database/sql/repositories/chart-of-accounts.repository';
import { AccountingJournalsRepository } from '@/database/sql/repositories/accounting-journals.repository';
import { AccountingInvoicesRepository } from '@/database/sql/repositories/accounting-invoices.repository';
import { AccountingPaymentsRepository } from '@/database/sql/repositories/accounting-payments.repository';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';
import { FiscalPeriodsRepository } from '@/database/sql/repositories/fiscal-periods.repository';
import { ChartOfAccount } from '@/database/sql/entities/chart-of-account.entity';
import { AccountingJournal } from '@/database/sql/entities/accounting-journal.entity';
import { AccountingInvoice } from '@/database/sql/entities/accounting-invoice.entity';
import { AccountingInvoiceLine } from '@/database/sql/entities/accounting-invoice-line.entity';
import { AccountingPayment } from '@/database/sql/entities/accounting-payment.entity';
import { JournalEntry } from '@/database/sql/entities/journal-entry.entity';
import { JournalLine } from '@/database/sql/entities/journal-line.entity';
import { FiscalPeriod } from '@/database/sql/entities/fiscal-period.entity';
import {
  AccountType,
  JournalType,
  AccountingDocType,
  AccountingDocStatus,
  AccountingPaymentStatus,
  JournalEntryStatus,
} from '@/common/enums/accounting.enums';

@Injectable()
export class AccountingService {
  constructor(
    private readonly coaRepository: ChartOfAccountsRepository,
    private readonly journalsRepository: AccountingJournalsRepository,
    private readonly invoicesRepository: AccountingInvoicesRepository,
    private readonly paymentsRepository: AccountingPaymentsRepository,
    private readonly journalEntriesRepository: JournalEntriesRepository,
    private readonly fiscalPeriodsRepository: FiscalPeriodsRepository,
  ) {}

  // ── Chart of Accounts ─────────────────────────────────────────────────────

  findAllAccounts(
    filters: { search?: string; accountType?: AccountType; isActive?: boolean } = {},
    page = 1,
    limit = 50,
  ) {
    return this.coaRepository.findAll(filters, page, limit);
  }

  findAccountById(id: string): Promise<ChartOfAccount> {
    return this.coaRepository.findById(id);
  }

  createAccount(data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    return this.coaRepository.create(data);
  }

  updateAccount(
    id: string,
    version: number,
    data: Partial<ChartOfAccount>,
  ): Promise<ChartOfAccount> {
    return this.coaRepository.update(id, version, data);
  }

  removeAccount(id: string): Promise<void> {
    return this.coaRepository.softDelete(id);
  }

  accountDropdown(accountType?: AccountType) {
    return this.coaRepository.findForDropdown(accountType);
  }

  // ── Journals ──────────────────────────────────────────────────────────────

  findAllJournals(type?: JournalType, isActive?: boolean) {
    return this.journalsRepository.findAll(type, isActive);
  }

  findJournalById(id: string): Promise<AccountingJournal> {
    return this.journalsRepository.findById(id);
  }

  createJournal(data: Partial<AccountingJournal>): Promise<AccountingJournal> {
    return this.journalsRepository.create(data);
  }

  updateJournal(
    id: string,
    version: number,
    data: Partial<AccountingJournal>,
  ): Promise<AccountingJournal> {
    return this.journalsRepository.update(id, version, data);
  }

  removeJournal(id: string): Promise<void> {
    return this.journalsRepository.softDelete(id);
  }

  journalDropdown(type?: JournalType) {
    return this.journalsRepository.findForDropdown(type);
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  findAllInvoices(
    branchId: string,
    filters: { docType?: AccountingDocType; status?: AccountingDocStatus; partnerId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    return this.invoicesRepository.findAll(branchId, filters, page, limit);
  }

  findInvoiceById(id: string): Promise<AccountingInvoice> {
    return this.invoicesRepository.findById(id);
  }

  findInvoiceWithLines(id: string) {
    return this.invoicesRepository.findWithLines(id);
  }

  createInvoice(data: Partial<AccountingInvoice>): Promise<AccountingInvoice> {
    return this.invoicesRepository.create(data);
  }

  updateInvoice(
    id: string,
    version: number,
    data: Partial<AccountingInvoice>,
  ): Promise<AccountingInvoice> {
    return this.invoicesRepository.update(id, version, data);
  }

  upsertInvoiceLines(id: string, lines: Partial<AccountingInvoiceLine>[]): Promise<void> {
    return this.invoicesRepository.upsertLines(id, lines);
  }

  removeInvoice(id: string): Promise<void> {
    return this.invoicesRepository.softDelete(id);
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  findAllPayments(
    branchId: string,
    filters: { status?: AccountingPaymentStatus; partnerId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    return this.paymentsRepository.findAll(branchId, filters, page, limit);
  }

  findPaymentById(id: string): Promise<AccountingPayment> {
    return this.paymentsRepository.findById(id);
  }

  createPayment(data: Partial<AccountingPayment>): Promise<AccountingPayment> {
    return this.paymentsRepository.create(data);
  }

  updatePayment(
    id: string,
    version: number,
    data: Partial<AccountingPayment>,
  ): Promise<AccountingPayment> {
    return this.paymentsRepository.update(id, version, data);
  }

  postPayment(id: string): Promise<AccountingPayment> {
    return this.paymentsRepository.post(id);
  }

  removePayment(id: string): Promise<void> {
    return this.paymentsRepository.softDelete(id);
  }

  // ── Journal Entries ───────────────────────────────────────────────────────

  findAllJournalEntries(
    branchId: string,
    filters: { status?: JournalEntryStatus; journalId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    return this.journalEntriesRepository.findAll(branchId, filters, page, limit);
  }

  findJournalEntryById(id: string): Promise<JournalEntry> {
    return this.journalEntriesRepository.findById(id);
  }

  findJournalEntryWithLines(id: string) {
    return this.journalEntriesRepository.findWithLines(id);
  }

  postJournalEntry(id: string, sequence: string): Promise<JournalEntry> {
    return this.journalEntriesRepository.post(id, sequence);
  }

  cancelJournalEntry(id: string): Promise<JournalEntry> {
    return this.journalEntriesRepository.cancel(id);
  }

  // ── Fiscal Periods ────────────────────────────────────────────────────────

  findAllFiscalPeriods() {
    return this.fiscalPeriodsRepository.findAll();
  }

  findFiscalPeriodById(id: string): Promise<FiscalPeriod> {
    return this.fiscalPeriodsRepository.findById(id);
  }

  findCurrentFiscalPeriod(): Promise<FiscalPeriod | null> {
    return this.fiscalPeriodsRepository.findCurrent();
  }

  createFiscalPeriod(data: Partial<FiscalPeriod>): Promise<FiscalPeriod> {
    return this.fiscalPeriodsRepository.create(data);
  }

  updateFiscalPeriod(
    id: string,
    version: number,
    data: Partial<FiscalPeriod>,
  ): Promise<FiscalPeriod> {
    return this.fiscalPeriodsRepository.update(id, version, data);
  }

  removeFiscalPeriod(id: string): Promise<void> {
    return this.fiscalPeriodsRepository.softDelete(id);
  }
}
