import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from '@/database/sql/entities/currency.entity';
import { ExchangeRate } from '@/database/sql/entities/exchange-rate.entity';
import { AccountGroup } from '@/database/sql/entities/account-group.entity';
import { ChartOfAccount } from '@/database/sql/entities/chart-of-account.entity';
import { AccountingJournal } from '@/database/sql/entities/accounting-journal.entity';
import { FiscalPeriod } from '@/database/sql/entities/fiscal-period.entity';
import { CostCenter } from '@/database/sql/entities/cost-center.entity';
import { JournalEntry } from '@/database/sql/entities/journal-entry.entity';
import { JournalLine } from '@/database/sql/entities/journal-line.entity';
import { AccountingInvoice } from '@/database/sql/entities/accounting-invoice.entity';
import { AccountingInvoiceLine } from '@/database/sql/entities/accounting-invoice-line.entity';
import { AccountingPayment } from '@/database/sql/entities/accounting-payment.entity';
import { CurrenciesRepository } from '@/database/sql/repositories/currencies.repository';
import { ChartOfAccountsRepository } from '@/database/sql/repositories/chart-of-accounts.repository';
import { AccountingJournalsRepository } from '@/database/sql/repositories/accounting-journals.repository';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';
import { AccountingInvoicesRepository } from '@/database/sql/repositories/accounting-invoices.repository';
import { AccountingPaymentsRepository } from '@/database/sql/repositories/accounting-payments.repository';
import { FiscalPeriodsRepository } from '@/database/sql/repositories/fiscal-periods.repository';
import { AccountingService } from './services/accounting.service';
import { AccountingController } from './controllers/accounting.controller';
import { InvoicesController } from './controllers/invoices.controller';
import { PaymentsController } from './controllers/payments.controller';
import { JournalEntriesController } from './controllers/journal-entries.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Currency,
      ExchangeRate,
      AccountGroup,
      ChartOfAccount,
      AccountingJournal,
      FiscalPeriod,
      CostCenter,
      JournalEntry,
      JournalLine,
      AccountingInvoice,
      AccountingInvoiceLine,
      AccountingPayment,
    ]),
  ],
  controllers: [
    AccountingController,
    InvoicesController,
    PaymentsController,
    JournalEntriesController,
  ],
  providers: [
    AccountingService,
    CurrenciesRepository,
    ChartOfAccountsRepository,
    AccountingJournalsRepository,
    JournalEntriesRepository,
    AccountingInvoicesRepository,
    AccountingPaymentsRepository,
    FiscalPeriodsRepository,
  ],
  exports: [
    AccountingService,
    CurrenciesRepository,
    ChartOfAccountsRepository,
    AccountingJournalsRepository,
    AccountingInvoicesRepository,
  ],
})
export class AccountingModule {}
