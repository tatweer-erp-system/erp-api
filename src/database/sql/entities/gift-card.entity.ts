import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { GiftCardStatus } from '@/common/enums/loyalty.enums';

@Entity({ name: 'gift_cards' })
export class GiftCard extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'initial_balance' })
  initialBalance: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'current_balance' })
  currentBalance: number;

  @Column({ type: 'uuid', name: 'issued_to', nullable: true })
  issuedTo: string | null;

  @Column({ type: 'uuid', name: 'issued_by', nullable: true })
  issuedBy: string | null;

  @Column({ type: 'date', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'enum', enum: GiftCardStatus, default: GiftCardStatus.ACTIVE })
  status: GiftCardStatus;
}
