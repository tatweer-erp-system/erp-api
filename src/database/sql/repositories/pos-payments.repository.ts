import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosPayment } from '../entities/pos-payment.entity';

@Injectable()
export class PosPaymentsRepository extends BaseRepository<PosPayment> {
  constructor() {
    super(PosPayment, false);
  }
}
