import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { AccountingDocType, AccountingDocStatus } from '@/common/enums/accounting.enums';

@Entity('accounting_invoices')
export class AccountingInvoice extends BaseEntity {
  @Column({ type: 'uuid', name: 'branch_id', nullable: false })
  branchId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  number: string | null;

  @Column({ type: 'enum', enum: AccountingDocType, name: 'doc_type', nullable: false })
  docType: AccountingDocType;

  @Column({
    type: 'enum',
    enum: AccountingDocStatus,
    default: AccountingDocStatus.DRAFT,
  })
  status: AccountingDocStatus;

  @Column({ type: 'uuid', name: 'partner_id', nullable: false })
  partnerId: string;

  @Column({ type: 'uuid', name: 'journal_id', nullable: true })
  journalId: string | null;

  @Column({ type: 'date', name: 'invoice_date', nullable: false })
  invoiceDate: string;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'uuid', name: 'payment_term_id', nullable: true })
  paymentTermId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'tax_amount', default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'amount_due', default: 0 })
  amountDue: number;

  @Column({ type: 'uuid', name: 'journal_entry_id', nullable: true })
  journalEntryId: string | null;

  @Column({ type: 'uuid', name: 'reversal_of', nullable: true })
  reversalOf: string | null;

  @Column({ type: 'uuid', name: 'salesperson_id', nullable: true })
  salespersonId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'source_model', nullable: true })
  sourceModel: string | null;

  @Column({ type: 'uuid', name: 'source_id', nullable: true })
  sourceId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
