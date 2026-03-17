import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { Invoice } from '../entities/invoice.entity';

@Injectable()
export class InvoicesRepository extends BaseRepository<Invoice> {
  constructor() {
    super(Invoice, true);
  }

  async findByIdWithLines(
    tenantId: string,
    id: string,
    transaction?: Transaction,
  ): Promise<Record<string, unknown> | null> {
    const rows = await this.rawQuery<Record<string, unknown>[]>(
      `SELECT inv.*,
         json_agg(
           json_build_object(
             'id', il.id,
             'productId', il."productId",
             'productVariantId', il."productVariantId",
             'description', il.description,
             'quantity', il.quantity,
             'unitPrice', il."unitPrice",
             'discountPct', il."discountPct",
             'priceSubtotal', il."priceSubtotal",
             'priceTax', il."priceTax",
             'priceTotal', il."priceTotal",
             'accountId', il."accountId",
             'sequence', il.sequence
           ) ORDER BY il.sequence, il.id
         ) FILTER (WHERE il.id IS NOT NULL) as lines
       FROM invoices inv
       LEFT JOIN invoice_lines il ON il."invoiceId" = inv.id AND il."deletedAt" IS NULL
       WHERE inv.id = :id AND inv."tenantId" = :tenantId AND inv."deletedAt" IS NULL
       GROUP BY inv.id`,
      { id, tenantId },
      transaction,
    );
    return rows[0] ?? null;
  }

  async sumPaymentsForInvoice(
    invoiceId: string,
    tenantId: string,
    transaction?: Transaction,
  ): Promise<number> {
    const rows = await this.rawQuery<{ total: string }[]>(
      `SELECT COALESCE(SUM(ip.amount), 0) as total
       FROM invoice_payments ip
       WHERE ip."invoiceId" = :invoiceId AND ip."tenantId" = :tenantId AND ip."deletedAt" IS NULL`,
      { invoiceId, tenantId },
      transaction,
    );
    return parseFloat(rows[0]?.total ?? '0');
  }
}
