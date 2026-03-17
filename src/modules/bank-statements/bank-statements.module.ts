import { Module } from '@nestjs/common';
import { BankStatementsController } from './controllers/bank-statements.controller';
import { BankStatementsService } from './services/bank-statements.service';

@Module({
  controllers: [BankStatementsController],
  providers: [BankStatementsService],
  exports: [BankStatementsService],
})
export class BankStatementsModule {}
