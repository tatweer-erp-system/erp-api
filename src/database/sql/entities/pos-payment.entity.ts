import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { PaymentMethod } from '@/common/enums/pos.enums';

@Entity({ name: 'pos_payments' })
export class PosPayment extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method', nullable: true })
  paymentMethod: PaymentMethod | null;

  /** Alias used by legacy service code */
  @Column({ type: 'enum', enum: PaymentMethod, name: 'method', nullable: true })
  method: PaymentMethod | null;

  @Column({ type: 'decimal', precision: 20, scale: 4 })
  amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'amount_given', nullable: true })
  amountGiven: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'change_amount', nullable: true })
  changeAmount: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', name: 'journal_id', nullable: true })
  journalId: string | null;

  @Column({ type: 'uuid', name: 'gift_card_id', nullable: true })
  giftCardId: string | null;

  @Column({ type: 'uuid', name: 'currency_id', nullable: true })
  currencyId: string | null;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;
}
