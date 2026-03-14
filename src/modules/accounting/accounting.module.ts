import { Module } from '@nestjs/common';
import { AccountsController } from './controllers/accounts.controller';
import { CostCentersController } from './controllers/cost-centers.controller';
import { FiscalPeriodsController } from './controllers/fiscal-periods.controller';
import { JournalEntriesController } from './controllers/journal-entries.controller';
import { ReportsController } from './controllers/reports.controller';
import { AccountsService } from './services/accounts.service';
import { CostCentersService } from './services/cost-centers.service';
import { FiscalPeriodsService } from './services/fiscal-periods.service';
import { JournalEntriesService } from './services/journal-entries.service';
import { JournalPosterService } from './services/journal-poster.service';
import { ReportsService } from './services/reports.service';

@Module({
  controllers: [
    AccountsController,
    CostCentersController,
    FiscalPeriodsController,
    JournalEntriesController,
    ReportsController,
  ],
  providers: [
    AccountsService,
    CostCentersService,
    FiscalPeriodsService,
    JournalEntriesService,
    JournalPosterService,
    ReportsService,
  ],
  exports: [],
})
export class AccountingModule {}
