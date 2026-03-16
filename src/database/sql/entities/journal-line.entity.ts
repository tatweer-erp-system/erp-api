import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('journal_lines')
export class JournalLine extends BaseEntity {
  @Column({ type: 'uuid', name: 'journal_entry_id', nullable: false })
  journalEntryId: string;

  @Column({ type: 'uuid', name: 'account_id', nullable: false })
  accountId: string;

  @Column({ type: 'uuid', name: 'partner_id', nullable: true })
  partnerId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0 })
  credit: number;

  @Column({ type: 'uuid', name: 'currency_id', nullable: true })
  currencyId: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'amount_currency', nullable: true })
  amountCurrency: number | null;

  @Column({ type: 'uuid', name: 'tax_id', nullable: true })
  taxId: string | null;

  @Column({ type: 'uuid', name: 'cost_center_id', nullable: true })
  costCenterId: string | null;

  @Column({ type: 'integer', default: 0 })
  sequence: number;
}
