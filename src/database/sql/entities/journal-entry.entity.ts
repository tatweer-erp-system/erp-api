import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { JournalEntryStatus } from '@/common/enums/accounting.enums';

@Entity('journal_entries')
export class JournalEntry extends BaseEntity {
  @Column({ type: 'uuid', name: 'branch_id', nullable: false })
  branchId: string;

  @Column({ type: 'uuid', name: 'journal_id', nullable: false })
  journalId: string;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sequence: string | null;

  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status: JournalEntryStatus;

  @Column({ type: 'text', nullable: true })
  narration: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'total_debit', default: 0 })
  totalDebit: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'total_credit', default: 0 })
  totalCredit: number;

  @Column({ type: 'uuid', name: 'reversal_of', nullable: true })
  reversalOf: string | null;

  @Column({ type: 'date', name: 'auto_reverse_date', nullable: true })
  autoReverseDate: string | null;

  @Column({ type: 'varchar', length: 100, name: 'source_model', nullable: true })
  sourceModel: string | null;

  @Column({ type: 'uuid', name: 'source_id', nullable: true })
  sourceId: string | null;
}
