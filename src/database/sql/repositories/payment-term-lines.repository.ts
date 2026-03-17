import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { PaymentTermLine } from '../entities/payment-term-line.entity';

@Injectable()
export class PaymentTermLinesRepository extends BaseRepository<PaymentTermLine> {
  constructor() {
    super(PaymentTermLine, true);
  }

  async findByPaymentTermId(
    tenantId: string,
    paymentTermId: string,
    transaction?: Transaction,
  ): Promise<PaymentTermLine[]> {
    return this.findAllRaw({
      where: { paymentTermId },
      tenantId,
      transaction,
      order: [['sequence', 'ASC']],
    });
  }

  async deleteByPaymentTermId(
    tenantId: string,
    paymentTermId: string,
    transaction?: Transaction,
  ): Promise<void> {
    await this.bulkUpdate({
      where: { paymentTermId },
      data: { deletedAt: new Date() },
      tenantId,
      transaction,
    });
  }
}
