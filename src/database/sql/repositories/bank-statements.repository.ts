import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { BankStatement } from '../entities/bank-statement.entity';

@Injectable()
export class BankStatementsRepository extends BaseRepository<BankStatement> {
  constructor() {
    super(BankStatement, true);
  }
}
