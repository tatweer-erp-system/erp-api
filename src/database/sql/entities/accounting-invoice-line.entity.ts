import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('accounting_invoice_lines')
export class AccountingInvoiceLine extends BaseEntity {
  @Column({ type: 'uuid', name: 'invoice_id', nullable: false })
  invoiceId: string;

  @Column({ type: 'uuid', name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ type: 'varchar', length: 500, default: '' })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'unit_price', default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'discount_percent', default: 0 })
  discountPercent: number;

  @Column({ type: 'uuid', name: 'tax_id', nullable: true })
  taxId: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'tax_amount', default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'tax_rate', default: 0 })
  taxRate: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0 })
  subtotal: number;

  @Column({ type: 'uuid', name: 'account_id', nullable: true })
  accountId: string | null;

  @Column({ type: 'integer', default: 0 })
  sequence: number;
}
