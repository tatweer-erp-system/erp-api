import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { BankStatementLine } from '../entities/bank-statement-line.entity';

@Injectable()
export class BankStatementLinesRepository extends BaseRepository<BankStatementLine> {
  constructor() {
    super(BankStatementLine, true);
  }
}
