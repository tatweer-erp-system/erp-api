import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { InvoicePayment } from '../entities/invoice-payment.entity';

@Injectable()
export class InvoicePaymentsRepository extends BaseRepository<InvoicePayment> {
  constructor() {
    super(InvoicePayment, true);
  }

  async existsForInvoice(
    invoiceId: string,
    tenantId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const rows = await this.rawQuery<{ cnt: string }[]>(
      `SELECT COUNT(*) as cnt FROM invoice_payments WHERE "invoiceId" = :invoiceId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { invoiceId, tenantId },
      transaction,
    );
    return parseInt(rows[0]?.cnt ?? '0', 10) > 0;
  }
}
