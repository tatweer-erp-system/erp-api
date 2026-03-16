import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramsController } from './controllers/programs.controller';
import { AccountsController } from './controllers/accounts.controller';
import { ProgramsService } from './services/programs.service';
import { LoyaltyEngineService } from './services/loyalty-engine.service';
import { PointsExpiryJob } from './jobs/points-expiry.job';
import { LoyaltyProgramsRepository } from '@/database/sql/repositories/loyalty-programs.repository';
import { LoyaltyTiersRepository } from '@/database/sql/repositories/loyalty-tiers.repository';
import { LoyaltyAccountsRepository } from '@/database/sql/repositories/loyalty-accounts.repository';
import { LoyaltyTransactionsRepository } from '@/database/sql/repositories/loyalty-transactions.repository';
import { LoyaltyProgram } from '@/database/sql/entities/loyalty-program.entity';
import { LoyaltyTier } from '@/database/sql/entities/loyalty-tier.entity';
import { LoyaltyAccount } from '@/database/sql/entities/loyalty-account.entity';
import { LoyaltyTransaction } from '@/database/sql/entities/loyalty-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoyaltyProgram, LoyaltyTier, LoyaltyAccount, LoyaltyTransaction]),
  ],
  controllers: [ProgramsController, AccountsController],
  providers: [
    LoyaltyProgramsRepository,
    LoyaltyTiersRepository,
    LoyaltyAccountsRepository,
    LoyaltyTransactionsRepository,
    ProgramsService,
    LoyaltyEngineService,
    PointsExpiryJob,
  ],
  exports: [LoyaltyEngineService],
})
export class LoyaltyModule {}
