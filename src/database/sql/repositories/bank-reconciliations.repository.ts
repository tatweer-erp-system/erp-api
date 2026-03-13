import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { BankReconciliation } from '../entities/bank-reconciliation.entity';

@Injectable()
export class BankReconciliationsRepository extends BaseRepository<BankReconciliation> {
  constructor() {
    // BankReconciliation has no tenantId column — scoped by accountId FK
    super(BankReconciliation, false);
  }
}
