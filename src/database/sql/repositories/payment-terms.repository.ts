import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PaymentTerm } from '../entities/payment-term.entity';

@Injectable()
export class PaymentTermsRepository extends BaseRepository<PaymentTerm> {
  constructor() {
    super(PaymentTerm, true);
  }
}
