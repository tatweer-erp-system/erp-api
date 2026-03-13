import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PaymentTransaction } from '../entities/payment-transaction.entity';

@Injectable()
export class PaymentTransactionsRepository extends BaseRepository<PaymentTransaction> {
  constructor() {
    super(PaymentTransaction, false);
  }

  async findByProviderTxId(providerTransactionId: string): Promise<PaymentTransaction | null> {
    return this.findOne({ where: { providerTransactionId } });
  }

  async findByTenant(tenantId: string): Promise<PaymentTransaction[]> {
    return this.findAllRaw({ where: { tenantId }, order: [['createdAt', 'DESC']] });
  }
}
