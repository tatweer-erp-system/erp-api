import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TreasuryTransactionType } from '@/common/enums/treasury.enums';

@Entity({ name: 'treasury_transactions' })
export class TreasuryTransaction extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'enum', enum: TreasuryTransactionType, name: 'transaction_type' })
  transactionType: TreasuryTransactionType;

  @Column({ type: 'decimal', precision: 20, scale: 4 })
  amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', name: 'to_account_id', nullable: true })
  toAccountId: string | null;

  @Column({ type: 'uuid', name: 'journal_entry_id', nullable: true })
  journalEntryId: string | null;
}
