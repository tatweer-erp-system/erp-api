import { Module } from '@nestjs/common';
import { TreasuryAccountsController } from './controllers/treasury-accounts.controller';
import { TreasuryTransactionsController } from './controllers/treasury-transactions.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { TreasuryDefinitionsController } from './controllers/treasury-definitions.controller';
import { TreasuryAccountsService } from './services/treasury-accounts.service';
import { TreasuryTransactionsService } from './services/treasury-transactions.service';
import { ReconciliationService } from './services/reconciliation.service';
import { TreasuryDefinitionsService } from './services/treasury-definitions.service';

@Module({
  controllers: [
    TreasuryAccountsController,
    TreasuryTransactionsController,
    ReconciliationController,
    TreasuryDefinitionsController,
  ],
  providers: [
    TreasuryAccountsService,
    TreasuryTransactionsService,
    ReconciliationService,
    TreasuryDefinitionsService,
  ],
  exports: [],
})
export class TreasuryModule {}
