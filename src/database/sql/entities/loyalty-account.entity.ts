import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'loyalty_accounts' })
@Index(['customerId', 'programId'], { unique: true })
export class LoyaltyAccount extends BaseEntity {
  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'uuid', name: 'program_id' })
  programId: string;

  @Column({ type: 'uuid', name: 'tier_id', nullable: true })
  tierId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'balance_points', default: 0 })
  balancePoints: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'lifetime_points', default: 0 })
  lifetimePoints: number;

  @Column({ type: 'date', name: 'expiry_date', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
