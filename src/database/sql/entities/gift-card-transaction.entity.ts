import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'gift_card_transactions' })
export class GiftCardTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'gift_card_id' })
  giftCardId: string;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 4 })
  amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 50, name: 'transaction_type' })
  transactionType: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
