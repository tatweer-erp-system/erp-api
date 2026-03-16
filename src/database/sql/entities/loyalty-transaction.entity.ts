import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { LoyaltyTransactionType } from '@/common/enums/loyalty.enums';

@Entity({ name: 'loyalty_transactions' })
export class LoyaltyTransaction extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'enum', enum: LoyaltyTransactionType, name: 'transaction_type' })
  transactionType: LoyaltyTransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  points: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'source_model', nullable: true })
  sourceModel: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', name: 'granted_by', nullable: true })
  grantedBy: string | null;
}
