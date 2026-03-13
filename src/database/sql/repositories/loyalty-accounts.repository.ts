import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LoyaltyAccount } from '../entities/loyalty-account.entity';

@Injectable()
export class LoyaltyAccountsRepository extends BaseRepository<LoyaltyAccount> {
  constructor() {
    super(LoyaltyAccount, true);
  }
}
