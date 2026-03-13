import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';

@Injectable()
export class TreasuryTransactionsRepository extends BaseRepository<TreasuryTransaction> {
  constructor() {
    super(TreasuryTransaction, true);
  }
}
