import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryAccount } from '@/database/sql/entities/treasury-account.entity';
import { TreasuryTransaction } from '@/database/sql/entities/treasury-transaction.entity';
import { BankReconciliation } from '@/database/sql/entities/bank-reconciliation.entity';
import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { BankReconciliationsRepository } from '@/database/sql/repositories/bank-reconciliations.repository';
import { TransferReasonsRepository } from '@/database/sql/repositories/transfer-reasons.repository';
import { TreasuryAccountsController } from './controllers/treasury-accounts.controller';
import { TreasuryTransactionsController } from './controllers/treasury-transactions.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { TreasuryDefinitionsController } from './controllers/treasury-definitions.controller';
import { TreasuryAccountsService } from './services/treasury-accounts.service';
import { TreasuryTransactionsService } from './services/treasury-transactions.service';
import { ReconciliationService } from './services/reconciliation.service';
import { TreasuryDefinitionsService } from './services/treasury-definitions.service';
import { CurrencyModule } from '@/modules/currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TreasuryAccount, TreasuryTransaction, BankReconciliation]),
    CurrencyModule,
  ],
  controllers: [
    TreasuryAccountsController,
    TreasuryTransactionsController,
    ReconciliationController,
    TreasuryDefinitionsController,
  ],
  providers: [
    TreasuryAccountsRepository,
    TreasuryTransactionsRepository,
    BankReconciliationsRepository,
    TransferReasonsRepository,
    TreasuryAccountsService,
    TreasuryTransactionsService,
    ReconciliationService,
    TreasuryDefinitionsService,
  ],
  exports: [
    TreasuryAccountsRepository,
    TreasuryTransactionsRepository,
    BankReconciliationsRepository,
  ],
})
export class TreasuryModule {}
