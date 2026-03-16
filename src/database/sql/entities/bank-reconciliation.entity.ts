import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { ReconciliationStatus } from '@/common/enums/treasury.enums';

@Entity({ name: 'bank_reconciliations' })
export class BankReconciliation extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'date', name: 'statement_date' })
  statementDate: Date;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'statement_balance' })
  statementBalance: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'system_balance' })
  systemBalance: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, default: 0 })
  difference: number;

  @Column({ type: 'enum', enum: ReconciliationStatus, default: ReconciliationStatus.DRAFT })
  status: ReconciliationStatus;

  @Column({ type: 'uuid', name: 'reconciled_by', nullable: true })
  reconciledBy: string | null;

  @Column({ type: 'timestamptz', name: 'reconciled_at', nullable: true })
  reconciledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
