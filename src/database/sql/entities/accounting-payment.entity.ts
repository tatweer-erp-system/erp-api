import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { AccountingPaymentType, AccountingPaymentStatus } from '@/common/enums/accounting.enums';

@Entity('accounting_payments')
export class AccountingPayment extends BaseEntity {
  @Column({ type: 'uuid', name: 'branch_id', nullable: false })
  branchId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'enum', enum: AccountingPaymentType, name: 'payment_type', nullable: false })
  paymentType: AccountingPaymentType;

  @Column({
    type: 'enum',
    enum: AccountingPaymentStatus,
    default: AccountingPaymentStatus.DRAFT,
  })
  status: AccountingPaymentStatus;

  @Column({ type: 'uuid', name: 'partner_id', nullable: true })
  partnerId: string | null;

  @Column({ type: 'uuid', name: 'journal_id', nullable: false })
  journalId: string;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0, nullable: false })
  amount: number;

  @Column({ type: 'date', name: 'payment_date', nullable: false })
  paymentDate: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  memo: string | null;

  @Column({ type: 'uuid', name: 'journal_entry_id', nullable: true })
  journalEntryId: string | null;

  @Column({ type: 'uuid', name: 'invoice_id', nullable: true })
  invoiceId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sequence: string | null;
}
