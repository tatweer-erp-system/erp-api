import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { FiscalPositionAccount } from '../entities/fiscal-position-account.entity';

@Injectable()
export class FiscalPositionAccountsRepository extends BaseRepository<FiscalPositionAccount> {
  constructor() {
    super(FiscalPositionAccount, true);
  }
}
