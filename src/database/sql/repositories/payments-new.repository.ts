import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PaymentNew } from '../entities/payment-new.entity';

@Injectable()
export class PaymentsNewRepository extends BaseRepository<PaymentNew> {
  constructor() {
    super(PaymentNew, true);
  }
}
