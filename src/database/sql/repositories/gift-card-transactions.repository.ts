import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { GiftCardTransaction } from '../entities/gift-card-transaction.entity';

@Injectable()
export class GiftCardTransactionsRepository extends BaseRepository<GiftCardTransaction> {
  constructor() {
    super(GiftCardTransaction, false);
  }
}
