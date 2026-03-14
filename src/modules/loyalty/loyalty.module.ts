import { Module } from '@nestjs/common';
import { ProgramsController } from './controllers/programs.controller';
import { AccountsController } from './controllers/accounts.controller';
import { ProgramsService } from './services/programs.service';
import { LoyaltyEngineService } from './services/loyalty-engine.service';

@Module({
  controllers: [ProgramsController, AccountsController],
  providers: [ProgramsService, LoyaltyEngineService],
  exports: [],
})
export class LoyaltyModule {}
