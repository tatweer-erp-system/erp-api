import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { InvoiceLineTax } from '../entities/invoice-line-tax.entity';

@Injectable()
export class InvoiceLineTaxesRepository extends BaseRepository<InvoiceLineTax> {
  constructor() {
    super(InvoiceLineTax, true);
  }

  async deleteByInvoiceLineId(invoiceLineId: string, transaction?: Transaction): Promise<void> {
    await this.rawQuery(
      `UPDATE invoice_line_taxes SET "deletedAt" = NOW() WHERE "invoiceLineId" = :invoiceLineId AND "deletedAt" IS NULL`,
      { invoiceLineId },
      transaction,
    );
  }
}
