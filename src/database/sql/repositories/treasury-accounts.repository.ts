import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TreasuryAccount } from '../entities/treasury-account.entity';

@Injectable()
export class TreasuryAccountsRepository extends BaseRepository<TreasuryAccount> {
  constructor() {
    super(TreasuryAccount, true);
  }
}
