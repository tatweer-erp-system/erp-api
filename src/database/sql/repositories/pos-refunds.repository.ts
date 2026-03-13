import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosRefund } from '../entities/pos-refund.entity';

@Injectable()
export class PosRefundsRepository extends BaseRepository<PosRefund> {
  constructor() {
    super(PosRefund, true);
  }
}
