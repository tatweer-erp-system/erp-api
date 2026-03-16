import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { RefundType } from '@/common/enums/pos.enums';

@Entity({ name: 'pos_refunds' })
export class PosRefund extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ type: 'uuid', name: 'original_order_id' })
  originalOrderId: string;

  @Column({ type: 'uuid', name: 'refund_order_id' })
  refundOrderId: string;

  @Column({ type: 'decimal', precision: 20, scale: 4 })
  amount: number;

  /** Alias used by legacy service code */
  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'total_refunded', nullable: true })
  totalRefunded: number | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'enum', enum: RefundType, name: 'refund_type', nullable: true })
  refundType: RefundType | null;

  @Column({ type: 'varchar', length: 100, name: 'refund_method', nullable: true })
  refundMethod: string | null;

  @Column({ type: 'uuid', name: 'cashier_id', nullable: true })
  cashierId: string | null;

  @Column({ type: 'uuid', name: 'approved_by', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', name: 'refunded_at', nullable: true })
  refundedAt: Date | null;
}
