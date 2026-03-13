import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LoyaltyTransaction } from '../entities/loyalty-transaction.entity';

@Injectable()
export class LoyaltyTransactionsRepository extends BaseRepository<LoyaltyTransaction> {
  constructor() {
    super(LoyaltyTransaction, false);
  }
}
