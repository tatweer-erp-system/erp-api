import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { InvoiceLine } from '../entities/invoice-line.entity';

@Injectable()
export class InvoiceLinesRepository extends BaseRepository<InvoiceLine> {
  constructor() {
    super(InvoiceLine, true);
  }

  async deleteByInvoiceId(invoiceId: string, transaction?: Transaction): Promise<void> {
    await this.rawQuery(
      `UPDATE invoice_lines SET "deletedAt" = NOW() WHERE "invoiceId" = :invoiceId AND "deletedAt" IS NULL`,
      { invoiceId },
      transaction,
    );
  }

  async findByInvoiceId(invoiceId: string, transaction?: Transaction): Promise<InvoiceLine[]> {
    const rows = await this.rawQuery<InvoiceLine[]>(
      `SELECT * FROM invoice_lines WHERE "invoiceId" = :invoiceId AND "deletedAt" IS NULL ORDER BY sequence, id`,
      { invoiceId },
      transaction,
    );
    return rows;
  }
}
