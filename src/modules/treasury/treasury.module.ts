import { Module } from '@nestjs/common';
import { TreasuryAccountsController } from './controllers/treasury-accounts.controller';
import { TreasuryTransactionsController } from './controllers/treasury-transactions.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { TreasuryAccountsService } from './services/treasury-accounts.service';
import { TreasuryTransactionsService } from './services/treasury-transactions.service';
import { ReconciliationService } from './services/reconciliation.service';

@Module({
  // NOTE: No AccountingModule import — JournalPosterService is injected via optional token
  //       to avoid circular dependencies. If AccountingModule is loaded, it must provide
  //       JournalPosterService with the token 'JournalPosterService'.
  imports: [],
  controllers: [
    TreasuryAccountsController,
    TreasuryTransactionsController,
    ReconciliationController,
  ],
  providers: [TreasuryAccountsService, TreasuryTransactionsService, ReconciliationService],
  exports: [],
})
export class TreasuryModule {}
